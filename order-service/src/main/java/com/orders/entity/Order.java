package com.orders.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "ORDERS")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Order {
    
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "order_seq_gen")
    @SequenceGenerator(name = "order_seq_gen", sequenceName = "ORDER_SEQ", allocationSize = 1)
    @Column(name = "ORDER_ID")
    private Long id;
    
    @Column(name = "CUSTOMER_NAME", nullable = false)
    private String customerName;
    
    @Column(name = "ORDER_DATE", nullable = false)
    private LocalDate orderDate;
    
    @Column(name = "TOTAL_AMOUNT", nullable = false)
    private BigDecimal totalAmount;
    
    @Column(name = "STATUS", nullable = false)
    private String status;
    
    @Column(name = "CREATED_AT")
    private LocalDateTime createdAt;
}
