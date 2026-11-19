const http = require('http');
const app = require('../server');

let server;
let token;
let createdCustomerId;
let createdProductId;
let createdInvoiceId;
let createdInvoiceNumber;

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data, headers: res.headers });
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING INVOICE PRO FULL-STACK API TEST SUITE');
  console.log('====================================================\n');

  // Start server on an ephemeral test port
  const PORT = 5555;
  await new Promise((resolve) => {
    server = app.listen(PORT, () => {
      console.log(`Test server running on port ${PORT}`);
      resolve();
    });
  });

  const baseHeaders = { 'Content-Type': 'application/json' };
  const authHeaders = () => ({ ...baseHeaders, Authorization: `Bearer ${token}` });

  let passed = 0;
  let failed = 0;

  async function assert(desc, fn) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${desc}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${desc} -> ${err.message}`);
      failed++;
    }
  }

  try {
    // 1. Health Check
    await assert('GET /api/health should return 200 and healthy status', async () => {
      const res = await request({ host: 'localhost', port: PORT, path: '/api/health', method: 'GET' });
      if (res.status !== 200 || res.data.status !== 'healthy') throw new Error(`Unexpected response: ${res.status}`);
    });

    // 2. Auth: Login with demo credentials
    await assert('POST /api/auth/login should authenticate demo user', async () => {
      const res = await request(
        { host: 'localhost', port: PORT, path: '/api/auth/login', method: 'POST', headers: baseHeaders },
        { email: 'demo@invoicepro.com', password: 'password123' }
      );
      if (res.status !== 200 || !res.data.token) throw new Error(`Login failed with status ${res.status}`);
      token = res.data.token;
    });

    // 3. Auth: GET /api/auth/me
    await assert('GET /api/auth/me should return current user & settings', async () => {
      const res = await request({ host: 'localhost', port: PORT, path: '/api/auth/me', method: 'GET', headers: authHeaders() });
      if (res.status !== 200 || !res.data.user) throw new Error(`Auth me failed: ${res.status}`);
    });

    // 4. Dashboard Summary
    await assert('GET /api/dashboard/summary should return dynamic financial metrics', async () => {
      const res = await request({ host: 'localhost', port: PORT, path: '/api/dashboard/summary', method: 'GET', headers: authHeaders() });
      if (res.status !== 200 || !res.data.summary) throw new Error(`Summary failed: ${res.status}`);
      if (typeof res.data.summary.total_revenue !== 'number') throw new Error('total_revenue is not a number');
    });

    // 5. Customer CRUD
    await assert('POST /api/customers should create a new customer', async () => {
      const res = await request(
        { host: 'localhost', port: PORT, path: '/api/customers', method: 'POST', headers: authHeaders() },
        {
          name: 'Test Client Ltd',
          company_name: 'Test Corp',
          email: 'test@testcorp.com',
          phone: '+91 99999 88888',
          city: 'Bengaluru',
          state: 'Karnataka',
          gstin: '29TESTC1234F1Z1'
        }
      );
      if (res.status !== 201 || !res.data.customer) throw new Error(`Customer creation failed: ${res.status}`);
      createdCustomerId = res.data.customer.id;
    });

    await assert('GET /api/customers should list customers with financial balances', async () => {
      const res = await request({ host: 'localhost', port: PORT, path: '/api/customers', method: 'GET', headers: authHeaders() });
      if (res.status !== 200 || !Array.isArray(res.data.customers)) throw new Error('Failed to list customers');
    });

    // 6. Product CRUD
    await assert('POST /api/products should create catalogue item', async () => {
      const res = await request(
        { host: 'localhost', port: PORT, path: '/api/products', method: 'POST', headers: authHeaders() },
        {
          name: 'API Security Audit Service',
          description: 'Penetration testing & OWASP verification',
          category: 'Security',
          unit_price: 50000,
          gst_rate: 18,
          product_type: 'service'
        }
      );
      if (res.status !== 201 || !res.data.product) throw new Error(`Product creation failed: ${res.status}`);
      createdProductId = res.data.product.id;
    });

    // 7. Next Invoice Number Generation
    await assert('GET /api/invoices/next-number should return next unique sequence', async () => {
      const res = await request({ host: 'localhost', port: PORT, path: '/api/invoices/next-number', method: 'GET', headers: authHeaders() });
      if (res.status !== 200 || !res.data.invoiceNumber) throw new Error('Next invoice number failed');
      createdInvoiceNumber = res.data.invoiceNumber;
    });

    // 8. Invoice Creation with GST Calculations
    await assert('POST /api/invoices should calculate subtotal, GST, and grand total', async () => {
      const res = await request(
        { host: 'localhost', port: PORT, path: '/api/invoices', method: 'POST', headers: authHeaders() },
        {
          customer_id: createdCustomerId,
          invoice_number: createdInvoiceNumber,
          invoice_date: '2026-11-19',
          due_date: '2026-12-04',
          payment_terms: 'Net 15',
          tax_type: 'cgst_sgst',
          status: 'pending',
          items: [
            {
              product_id: createdProductId,
              item_name: 'API Security Audit Service',
              quantity: 2,
              unit_price: 50000,
              discount_percent: 10, // Base = 100,000, Disc = 10,000, Taxable = 90,000
              tax_percent: 18 // Tax = 16,200 (CGST: 8100, SGST: 8100), Grand Total = 106,200
            }
          ]
        }
      );
      if (res.status !== 201 || !res.data.invoiceId) throw new Error(`Invoice create failed: ${res.status}`);
      createdInvoiceId = res.data.invoiceId;
    });

    // 9. Fetch Created Invoice
    await assert('GET /api/invoices/:id should return line items and correct calculations', async () => {
      const res = await request({ host: 'localhost', port: PORT, path: `/api/invoices/${createdInvoiceId}`, method: 'GET', headers: authHeaders() });
      if (res.status !== 200) throw new Error(`Failed to fetch invoice: ${res.status}`);
      const inv = res.data.invoice;
      if (Number(inv.grand_total) !== 106200) {
        throw new Error(`Grand total expected 106200, got ${inv.grand_total}`);
      }
      if (Number(inv.cgst_amount) !== 8100 || Number(inv.sgst_amount) !== 8100) {
        throw new Error(`CGST/SGST mismatch: ${inv.cgst_amount}, ${inv.sgst_amount}`);
      }
      if (Number(inv.due_amount) !== 106200) {
        throw new Error(`Due amount expected 106200, got ${inv.due_amount}`);
      }
    });

    // 10. Payment Module: Partial payment validation
    await assert('POST /api/payments should record partial payment and update invoice', async () => {
      const res = await request(
        { host: 'localhost', port: PORT, path: '/api/payments', method: 'POST', headers: authHeaders() },
        {
          invoice_id: createdInvoiceId,
          payment_date: '2026-11-19',
          amount: 50000,
          payment_method: 'UPI',
          transaction_reference: 'UPI/TEST/991204',
          notes: 'Test advance payment'
        }
      );
      if (res.status !== 201) throw new Error(`Payment failed: ${res.status}`);
      if (res.data.invoice.status !== 'partially_paid') {
        throw new Error(`Status expected partially_paid, got ${res.data.invoice.status}`);
      }
      if (Number(res.data.invoice.due_amount) !== 56200) {
        throw new Error(`Due amount expected 56200, got ${res.data.invoice.due_amount}`);
      }
    });

    // 11. Overpayment Protection Test: Cannot pay more than balance due
    await assert('POST /api/payments should REJECT payment exceeding balance due', async () => {
      const res = await request(
        { host: 'localhost', port: PORT, path: '/api/payments', method: 'POST', headers: authHeaders() },
        {
          invoice_id: createdInvoiceId,
          payment_date: '2026-11-19',
          amount: 60000, // Due is only 56200
          payment_method: 'UPI'
        }
      );
      if (res.status !== 400) throw new Error(`Expected 400 rejection, got ${res.status}`);
    });

    // 12. Full Payment & Status Progression Test
    await assert('POST /api/payments should transition invoice to PAID when fully settled', async () => {
      const res = await request(
        { host: 'localhost', port: PORT, path: '/api/payments', method: 'POST', headers: authHeaders() },
        {
          invoice_id: createdInvoiceId,
          payment_date: '2026-11-19',
          amount: 56200, // Settles remaining balance
          payment_method: 'Bank Transfer',
          transaction_reference: 'NEFT/SETTLE/100'
        }
      );
      if (res.status !== 201) throw new Error(`Settlement payment failed: ${res.status}`);
      if (res.data.invoice.status !== 'paid') {
        throw new Error(`Status expected 'paid', got '${res.data.invoice.status}'`);
      }
      if (Number(res.data.invoice.due_amount) !== 0) {
        throw new Error(`Due amount expected 0, got ${res.data.invoice.due_amount}`);
      }
    });

    // 13. Reports Endpoints
    await assert('GET /api/reports/monthly-revenue should return monthly figures', async () => {
      const res = await request({ host: 'localhost', port: PORT, path: '/api/reports/monthly-revenue?year=2026', method: 'GET', headers: authHeaders() });
      if (res.status !== 200 || !res.data.monthlyReport) throw new Error('Monthly report failed');
    });

    await assert('GET /api/reports/customer-wise should return customer billing stats', async () => {
      const res = await request({ host: 'localhost', port: PORT, path: '/api/reports/customer-wise', method: 'GET', headers: authHeaders() });
      if (res.status !== 200 || !res.data.customerReport) throw new Error('Customer report failed');
    });

    // 14. PDF Generation Endpoint
    await assert('GET /api/invoices/:id/pdf should stream valid PDF document', async () => {
      const res = await request({ host: 'localhost', port: PORT, path: `/api/invoices/${createdInvoiceId}/pdf`, method: 'GET', headers: authHeaders() });
      if (res.status !== 200 || res.headers['content-type'] !== 'application/pdf') {
        throw new Error(`PDF endpoint returned status ${res.status}, type: ${res.headers['content-type']}`);
      }
    });

    // 15. Safe Customer Deletion Protection
    await assert('DELETE /api/customers/:id should REJECT deletion when customer has invoices', async () => {
      const res = await request({ host: 'localhost', port: PORT, path: `/api/customers/${createdCustomerId}`, method: 'DELETE', headers: authHeaders() });
      if (res.status !== 400) {
        throw new Error(`Expected 400 rejection for customer with invoices, got ${res.status}`);
      }
    });

  } finally {
    server.close();
    console.log('\n====================================================');
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');
    if (failed > 0) {
      process.exit(1);
    }
  }
}

runTests();
