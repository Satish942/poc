import xml.etree.ElementTree as ET

def setup_jmx(input_file, output_file):
    tree = ET.parse(input_file)
    root = tree.getroot()
    
    # Find the ThreadGroup and update duration to 120 seconds to make tests faster
    for tg in root.findall(".//ThreadGroup"):
        for prop in tg.findall("longProp"):
            if prop.get("name") == "ThreadGroup.duration":
                prop.text = "120"
        for prop in tg.findall("intProp"):
            if prop.get("name") == "ThreadGroup.num_threads":
                prop.text = "60" # ensure enough threads to hit 500 RPS

    # Find the HashTree containing the samplers (it's the next sibling after ThreadGroup)
    thread_group_idx = -1
    for i, child in enumerate(root.find("hashTree").find("hashTree")):
        if child.tag == "ThreadGroup":
            thread_group_idx = i
            break
            
    if thread_group_idx != -1:
        sampler_hashTree = root.find("hashTree").find("hashTree")[thread_group_idx + 1]
        
        # Inject Constant Throughput Timer
        timer = ET.Element("ConstantThroughputTimer", guiclass="TestBeanGUI", testclass="ConstantThroughputTimer", testname="Constant Throughput Timer")
        ET.SubElement(timer, "intProp", name="calcMode").text = "1"
        ET.SubElement(timer, "stringProp", name="throughput").text = "${__P(throughput, 3000)}"
        
        sampler_hashTree.insert(0, timer)
        sampler_hashTree.insert(1, ET.Element("hashTree"))

    tree.write(output_file, xml_declaration=True, encoding="UTF-8")
    print(f"Generated {output_file} successfully.")

if __name__ == "__main__":
    setup_jmx("C:\\POC\\stress-test.jmx", "C:\\POC\\stress-test-dynamic.jmx")
