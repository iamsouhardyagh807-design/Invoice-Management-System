-- ===================================================
-- INVOICE PRO - SAMPLE SEED DATA
-- ===================================================

USE `invoice_pro`;

-- Note: Password for demo user is 'password123'
-- Hash: $2b$10$3zR14Q64WdC6Z7B98e7o4eQeN6n5K7VzN4m5L6k7J8i9H0g1f2e3d or auto-seeded by backend
INSERT INTO `users` (`id`, `name`, `business_name`, `email`, `phone`, `password`, `role`, `created_at`, `updated_at`)
VALUES
(1, 'Alex Morgan', 'Apex Digital Solutions Pvt Ltd', 'demo@invoicepro.com', '+91 98765 43210', '$2a$10$XQGv43G6LhKzU6k4V5gGZOWJ9B5XGz6G7i3mXz0t.eK8m7O2h.c1C', 'admin', NOW(), NOW())
ON DUPLICATE KEY UPDATE `id` = `id`;

-- BUSINESS SETTINGS
INSERT INTO `business_settings` (`id`, `user_id`, `business_name`, `logo_url`, `email`, `phone`, `address`, `city`, `state`, `postal_code`, `country`, `gstin`, `currency`, `currency_symbol`, `invoice_prefix`, `next_invoice_number`, `default_tax_rate`, `default_payment_terms`, `invoice_footer`, `created_at`, `updated_at`)
VALUES
(1, 1, 'Apex Digital Solutions Pvt Ltd', '', 'billing@apexdigital.io', '+91 80 4912 3456', 'Tower 4, 6th Floor, Embassy TechVillage, Outer Ring Road', 'Bengaluru', 'Karnataka', '560103', 'India', '29AABCA1234F1Z5', 'INR', '₹', 'INV-', 1007, 18.00, 'Due within 15 days of invoice date', 'Thank you for choosing Apex Digital Solutions. Please transfer payments to HDFC A/C: 50200012345678, IFSC: HDFC0000123.', NOW(), NOW())
ON DUPLICATE KEY UPDATE `id` = `id`;

-- CUSTOMERS
INSERT INTO `customers` (`id`, `user_id`, `name`, `company_name`, `email`, `phone`, `billing_address`, `city`, `state`, `postal_code`, `gstin`, `notes`, `created_at`, `updated_at`)
VALUES
(1, 1, 'Rajesh Sharma', 'Quantum Innovations Ltd', 'finance@quantuminnovations.com', '+91 98111 22334', 'Level 5, DLF Cyber City, Phase II', 'Gurugram', 'Haryana', '122002', '06AAACQ4321B1Z2', 'Key enterprise client. NET 30 payment terms.', NOW(), NOW()),
(2, 1, 'Priya Nair', 'Zenith Cloud Softwares', 'priya@zenithcloud.io', '+91 97222 33445', 'Plot 18, Electronic City Phase 1', 'Bengaluru', 'Karnataka', '560100', '29AAACZ9876C1Z4', 'Prompt monthly payer.', NOW(), NOW()),
(3, 1, 'Vikram Mehta', 'Aura Retail Enterprises', 'accounts@auraretail.in', '+91 99333 44556', '88 Nariman Point, Marine Lines', 'Mumbai', 'Maharashtra', '400021', '27AAACA5432D1Z8', 'Retail chain integration project.', NOW(), NOW()),
(4, 1, 'Sneha Patel', 'NextGen Logistics Co.', 'sneha@nextgenlogistics.com', '+91 98444 55667', '402 SG Highway, Bodakdev', 'Ahmedabad', 'Gujarat', '380054', '24AAACN1122E1Z1', 'Custom ERP deployment.', NOW(), NOW()),
(5, 1, 'Arjun Reddy', 'Kaveri MedTech Solutions', 'billing@kaverimedtech.org', '+91 97555 66778', 'Road No. 36, Jubilee Hills', 'Hyderabad', 'Telangana', '500033', '36AAACK7788F1Z9', 'Healthcare analytics portal client.', NOW(), NOW())
ON DUPLICATE KEY UPDATE `id` = `id`;

-- PRODUCTS & SERVICES
INSERT INTO `products` (`id`, `user_id`, `name`, `description`, `category`, `unit_price`, `gst_rate`, `product_type`, `created_at`, `updated_at`)
VALUES
(1, 1, 'Custom Cloud Architecture & DevOps', 'Complete architecture design, AWS/GCP orchestration, CI/CD pipeline, and Kubernetes setup', 'DevOps & Cloud', 75000.00, 18.00, 'service', NOW(), NOW()),
(2, 1, 'Full-Stack Web App Development', 'Bespoke React + Node.js full-stack portal development per milestone specification', 'Software Development', 120000.00, 18.00, 'service', NOW(), NOW()),
(3, 1, 'Enterprise Security & Penetration Audit', 'Comprehensive vulnerability assessment, penetration testing, and compliance report', 'Security', 45000.00, 18.00, 'service', NOW(), NOW()),
(4, 1, 'UI/UX Design System & Prototyping', 'Complete design tokens, high-fidelity Figma components, mobile app mockups', 'Design', 35000.00, 18.00, 'service', NOW(), NOW()),
(5, 1, 'Monthly Retainer Maintenance', 'Dedicated 24/7 SLA, monitoring, database backups, minor enhancement support', 'Maintenance', 25000.00, 18.00, 'service', NOW(), NOW()),
(6, 1, 'Hardware IoT Gateway Unit', 'Edge compute gateway unit with dual SIM 4G failover and telemetry firmware', 'Hardware', 18500.00, 18.00, 'product', NOW(), NOW())
ON DUPLICATE KEY UPDATE `id` = `id`;

-- INVOICES
-- Invoice 1: Paid (Customer 2 - Intra-state Karnataka CGST+SGST)
INSERT INTO `invoices` (`id`, `user_id`, `customer_id`, `invoice_number`, `invoice_date`, `due_date`, `payment_terms`, `tax_type`, `subtotal`, `discount_total`, `tax_total`, `cgst_amount`, `sgst_amount`, `igst_amount`, `grand_total`, `paid_amount`, `due_amount`, `status`, `notes`, `terms`, `created_at`, `updated_at`)
VALUES
(1, 1, 2, 'INV-1001', '2026-10-01', '2026-10-15', 'Due within 15 days', 'cgst_sgst', 120000.00, 5000.00, 20700.00, 10350.00, 10350.00, 0.00, 135700.00, 135700.00, 0.00, 'paid', 'Phase 1 portal completion invoice.', 'Warranty covers 90 days after delivery.', NOW(), NOW()),

-- Invoice 2: Partially Paid (Customer 1 - Inter-state IGST)
(2, 1, 1, 'INV-1002', '2026-10-18', '2026-11-02', 'Due within 15 days', 'igst', 75000.00, 0.00, 13500.00, 0.00, 0.00, 13500.00, 88500.00, 50000.00, 38500.00, 'partially_paid', 'Cloud architecture milestone 1.', 'Balance payable upon final sign-off.', NOW(), NOW()),

-- Invoice 3: Pending (Customer 3 - Inter-state IGST)
(3, 1, 3, 'INV-1003', '2026-11-10', '2026-11-25', 'Due within 15 days', 'igst', 35000.00, 1000.00, 6120.00, 0.00, 0.00, 6120.00, 40120.00, 0.00, 40120.00, 'pending', 'UI/UX Design system delivery.', 'Includes all Figma component sources.', NOW(), NOW()),

-- Invoice 4: Overdue (Customer 4 - Inter-state IGST)
(4, 1, 4, 'INV-1004', '2026-09-15', '2026-09-30', 'Due within 15 days', 'igst', 45000.00, 0.00, 8100.00, 0.00, 0.00, 8100.00, 53100.00, 0.00, 53100.00, 'overdue', 'Security audit report invoice. Payment reminder sent.', 'Overdue interest applicable at 1.5% per month.', NOW(), NOW()),

-- Invoice 5: Draft (Customer 5)
(5, 1, 5, 'INV-1005', '2026-11-15', '2026-11-30', 'Due within 15 days', 'igst', 25000.00, 0.00, 4500.00, 0.00, 0.00, 4500.00, 29500.00, 0.00, 29500.00, 'draft', 'Draft for monthly maintenance retainer.', 'Standard maintenance terms apply.', NOW(), NOW()),

-- Invoice 6: Paid (Customer 2 - Intra-state)
(6, 1, 2, 'INV-1006', '2026-08-05', '2026-08-20', 'Due within 15 days', 'cgst_sgst', 50000.00, 2000.00, 8640.00, 4320.00, 4320.00, 0.00, 56640.00, 56640.00, 0.00, 'paid', 'Sprint 1 development & staging deploy.', 'Full payment received with thanks.', NOW(), NOW())
ON DUPLICATE KEY UPDATE `id` = `id`;

-- INVOICE ITEMS
INSERT INTO `invoice_items` (`id`, `invoice_id`, `product_id`, `item_name`, `description`, `quantity`, `unit_price`, `discount_percent`, `tax_percent`, `line_total`, `created_at`)
VALUES
-- Items for Invoice 1
(1, 1, 2, 'Full-Stack Web App Development', 'Bespoke React + Node.js milestone 1 deliverables', 1.00, 120000.00, 4.17, 18.00, 135700.00, NOW()),

-- Items for Invoice 2
(2, 2, 1, 'Custom Cloud Architecture & DevOps', 'AWS infrastructure provisioning and EKS setup', 1.00, 75000.00, 0.00, 18.00, 88500.00, NOW()),

-- Items for Invoice 3
(3, 3, 4, 'UI/UX Design System & Prototyping', 'Complete design system and prototype in Figma', 1.00, 35000.00, 2.86, 18.00, 40120.00, NOW()),

-- Items for Invoice 4
(4, 4, 3, 'Enterprise Security & Penetration Audit', 'Complete security audit & remediation report', 1.00, 45000.00, 0.00, 18.00, 53100.00, NOW()),

-- Items for Invoice 5
(5, 5, 5, 'Monthly Retainer Maintenance', 'Monthly maintenance and support package', 1.00, 25000.00, 0.00, 18.00, 29500.00, NOW()),

-- Items for Invoice 6
(6, 6, 5, 'Monthly Retainer Maintenance', 'Maintenance for Month of August', 2.00, 25000.00, 4.00, 18.00, 56640.00, NOW())
ON DUPLICATE KEY UPDATE `id` = `id`;

-- PAYMENTS
INSERT INTO `payments` (`id`, `user_id`, `invoice_id`, `customer_id`, `payment_date`, `amount`, `payment_method`, `transaction_reference`, `notes`, `created_at`)
VALUES
(1, 1, 1, 2, '2026-10-12', 135700.00, 'Bank Transfer', 'NEFT-HDFC-991204', 'Full settlement received via NEFT.', NOW()),
(2, 1, 2, 1, '2026-10-25', 50000.00, 'UPI', 'UPI/229011928371@hdfc', 'Milestone 1 advance payment via UPI.', NOW()),
(3, 1, 6, 2, '2026-08-18', 56640.00, 'Card', 'TXN_CARD_887163', 'Paid via corporate credit card portal.', NOW())
ON DUPLICATE KEY UPDATE `id` = `id`;
