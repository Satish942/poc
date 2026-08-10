# KEDA and Istio HPA Proof of Concept (POC)

This document outlines the complete setup, configuration changes, and testing instructions for the Kubernetes Event-driven Autoscaling (KEDA) POC using Istio Prometheus metrics.

## 1. Overview
The goal of this POC is to demonstrate real-time Horizontal Pod Autoscaling (HPA) of a Spring Boot backend application based on incoming HTTP request rates (`istio_requests_total`). The application connects to a local Oracle database. We use **KEDA** to pull metrics from **Istio's Prometheus** instance and dynamically scale the backend pods up under heavy load, and back down when traffic subsides.

## 2. Key Changes Implemented

During the POC, several critical configuration changes were made to stabilize the environment and ensure successful scaling:

### Database Connection Management
When the HPA scaled up the pods to handle high traffic, the Oracle Free Edition database (running locally via Docker) was overwhelmed and crashed due to connection exhaustion. To fix this:
1. **Hikari Connection Pool Limit**: We updated `order-service/src/main/resources/application.properties` to limit the connections per pod:
   ```properties
   spring.datasource.hikari.maximum-pool-size=2
   ```
2. **Environment Variables**: We updated `k8s/kubernetes-manifests.yaml` to inject the correct DB credentials and point to the host machine's Oracle DB using `host.docker.internal`:
   ```yaml
   env:
   - name: SPRING_DATASOURCE_URL
     value: "jdbc:oracle:thin:@host.docker.internal:1521/FREEPDB1"
   - name: SPRING_DATASOURCE_USERNAME
     value: "pocuser"
   - name: SPRING_DATASOURCE_PASSWORD
     value: "pocpassword"
   ```

### Local Image Resolution
To ensure Kubernetes could pull the locally built Docker images without attempting to reach Docker Hub and throwing an `ImagePullBackOff` error, we updated the deployment manifests in `k8s/kubernetes-manifests.yaml`:
```yaml
imagePullPolicy: IfNotPresent
```

### K6 Load Test Tuning
The initial load test script simulated 100 virtual users (VUs) with very low latency, generating over 1,000 requests per second. This was too aggressive for a single local Oracle instance. We modified `load-test.js` to simulate 20 VUs:
```javascript
  stages: [
    { duration: '30s', target: 5 },  // Ramp up to 5 users
    { duration: '1m', target: 20 }, // Ramp up to 20 users (still enough to trigger scale up)
    { duration: '1m', target: 20 }, // Stay at 20 users to trigger HPA scale-up
    { duration: '30s', target: 5 },  // Ramp down to 5 users to observe scale-down
  ],
```
This change generates enough traffic (~200 RPS) to trigger the KEDA scaling threshold (50 RPS per pod) without crashing the database.

## 3. Testing Guide

Follow these steps to deploy the application and run the load test to observe KEDA in action.

### Step 1: Build the Docker Image
Whenever you change the source code or `application.properties`, you must rebuild the image:
```bash
docker build -t poc-backend:latest ./order-service
```

### Step 2: Deploy the Application and HPA
Apply the Kubernetes manifests to deploy the backend, frontend, and the KEDA ScaledObject:
```bash
kubectl apply -f k8s/kubernetes-manifests.yaml
kubectl apply -f k8s/hpa.yaml
```
*(If you just rebuilt the image and the deployment already exists, force a restart with: `kubectl rollout restart deployment backend-app`)*

### Step 3: Monitor the Scaling (Open 2 Terminals)
Open two separate terminal windows to watch the live state of the cluster.

**Terminal 1: Watch the Pods**
```bash
kubectl get pods -l app=backend -w
```
**Terminal 2: Watch the HPA**
```bash
kubectl get hpa -w
```

### Step 4: Trigger the Load Test
Run the K6 load test. This creates a ConfigMap from your local `load-test.js` script and runs it inside a Kubernetes Job.
```bash
# 1. Update the ConfigMap with your local script
kubectl create configmap k6-test-script --from-file=load-test.js=load-test.js -o yaml --dry-run=client | kubectl apply -f -

# 2. Delete any old completed job
kubectl delete job k6-load-test --ignore-not-found

# 3. Start the new load test job
kubectl apply -f k6-job.yaml
```

### Step 5: Observe the Results
1. **Scale Up**: Within 30-60 seconds of the load test starting, the HPA will detect that the `istio_requests_total` metric has exceeded the threshold of `50`. You will see the HPA `TARGETS` increase, and new `backend-app` pods will spin up in your terminal.
2. **Stability**: Because of the `maximum-pool-size=2` fix, the new pods will reach a `2/2 Running` state without crashing the Oracle database.
3. **Scale Down**: Once the load test finishes, the HPA will recognize the drop in traffic. After a cooldown period, it will terminate the extra pods, bringing the replica count back down to `1`. *(Note: You may briefly see `Error` states on the terminating pods as the Istio sidecar cuts network access before Spring Boot finishes its graceful shutdown. This is expected behavior during scale-down).*
============================


---------------------------
C:\Users\Administrator-satish>kubectl get hpa -w
NAME                            REFERENCE                TARGETS      MINPODS   MAXPODS   REPLICAS   AGE
keda-hpa-backend-scaledobject   Deployment/backend-app   0/50 (avg)   1         10        6          4h47m
keda-hpa-backend-scaledobject   Deployment/backend-app   0/50 (avg)   1         10        1          4h47m

C:\Users\Administrator-satish>kubectl get pods -l app=backend -w
NAME                           READY   STATUS    RESTARTS   AGE
backend-app-766bfcf98d-9vtfc   2/2     Running   0          11m

100 10 9000  - jmeter scales upto 7 pods.


Don't worry, this is actually completely normal and harmless behavior during a scale-down event!

Here is what is happening:

Your load test finished, so the traffic dropped to 0.
The HPA (KEDA) noticed this and decided you no longer need 8+ pods, so it started scaling back down to 1 pod.
Kubernetes sends a SIGTERM (shutdown signal) to the extra pods, putting them in the Terminating state.
Because you have two containers in each pod (the backend Spring Boot app and the istio-proxy sidecar), they both get the shutdown signal.
Often, the istio-proxy sidecar shuts down instantly, instantly cutting off all network access. Meanwhile, Spring Boot is still trying to gracefully close its Oracle database connections.
Since the network is gone, Spring Boot throws an exception during shutdown and exits with a non-zero exit code.
Kubernetes sees the non-zero exit code and briefly flags it as Error right before it finishes deleting the pod permanently.
You can confirm this by running kubectl get pods -l app=backend. You'll see that all those Error pods are now completely gone, and you are left with just your 1 healthy base replica:

text
NAME                           READY   STATUS    RESTARTS   AGE
backend-app-766bfcf98d-9vtfc   2/2     Running   0          12m
This means your HPA scale-up and scale-down worked absolutely perfectly! The pods successfully spun up to handle the load, and successfully spun down to save resources when the load stopped.

--------------------------------------------------------