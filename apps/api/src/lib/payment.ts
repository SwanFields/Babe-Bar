export type PaymentRequest = { amountSatang: number; currency: string; idempotencyKey: string };
export type PaymentResult = { providerReference: string; status: "succeeded" | "failed" };
export interface PaymentAdapter {
  charge(request: PaymentRequest): Promise<PaymentResult>;
}
export class MockPaymentAdapter implements PaymentAdapter {
  async charge(request: PaymentRequest): Promise<PaymentResult> {
    return { providerReference: `mock_${request.idempotencyKey}`, status: "succeeded" };
  }
}
export const paymentAdapter: PaymentAdapter = new MockPaymentAdapter();
