package com.orders.service;

import com.orders.entity.Order;
import com.orders.repository.OrderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class OrderService {

    @Autowired
    private OrderRepository orderRepository;

    public List<Order> getAllOrders() {
        return orderRepository.findAll();
    }

    public Optional<Order> getOrderById(Long id) {
        return orderRepository.findById(id);
    }

    public List<Order> getOrdersByCustomer(String customerName) {
        return orderRepository.findByCustomerName(customerName);
    }

    public List<Order> getOrdersByStatus(String status) {
        return orderRepository.findByStatus(status);
    }

    public Order createOrder(Order order) {
        order.setCreatedAt(LocalDateTime.now());
        return orderRepository.save(order);
    }

    public Order updateOrder(Long id, Order orderDetails) {
        Optional<Order> order = orderRepository.findById(id);
        if (order.isPresent()) {
            Order existingOrder = order.get();
            existingOrder.setCustomerName(orderDetails.getCustomerName());
            existingOrder.setOrderDate(orderDetails.getOrderDate());
            existingOrder.setTotalAmount(orderDetails.getTotalAmount());
            existingOrder.setStatus(orderDetails.getStatus());
            return orderRepository.save(existingOrder);
        }
        return null;
    }

    public boolean deleteOrder(Long id) {
        if (orderRepository.existsById(id)) {
            orderRepository.deleteById(id);
            return true;
        }
        return false;
    }

    public void initializeSampleData() {
        orderRepository.save(new Order(null, "John Doe", LocalDate.now(), new BigDecimal("1500.00"), "COMPLETED", LocalDateTime.now()));
        orderRepository.save(new Order(null, "Jane Smith", LocalDate.now(), new BigDecimal("2300.50"), "PENDING", LocalDateTime.now()));
        orderRepository.save(new Order(null, "Bob Johnson", LocalDate.now(), new BigDecimal("890.75"), "SHIPPED", LocalDateTime.now()));
        orderRepository.save(new Order(null, "Alice Brown", LocalDate.now(), new BigDecimal("3400.00"), "COMPLETED", LocalDateTime.now()));
        orderRepository.save(new Order(null, "Charlie Wilson", LocalDate.now(), new BigDecimal("1200.00"), "PENDING", LocalDateTime.now()));
    }
}
