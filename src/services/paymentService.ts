// Note: This service would integrate with your backend
// The actual Stripe integration should be done on the backend for security

export interface PaymentConfig {
  backendUrl: string;
  apiKey: string;
}

export interface SubscriptionResponse {
  success: boolean;
  subscriptionId: string;
  status: string;
  message: string;
}

export class PaymentService {
  private backendUrl: string;

  constructor(backendUrl: string = 'https://api.databees.app') {
    this.backendUrl = backendUrl;
  }

  async initializeCheckout(email: string): Promise<string> {
    try {
      const response = await fetch(`${this.backendUrl}/api/checkout/initialize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      if (!response.ok) {
        throw new Error('Failed to initialize checkout');
      }

      const data: any = await response.json();
      return data.checkoutUrl;
    } catch (error) {
      throw new Error(`Checkout initialization failed: ${error}`);
    }
  }

  async verifySubscription(subscriptionId: string): Promise<SubscriptionResponse> {
    try {
      const response = await fetch(`${this.backendUrl}/api/subscriptions/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ subscriptionId })
      });

      if (!response.ok) {
        throw new Error('Subscription verification failed');
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Verification failed: ${error}`);
    }
  }

  async cancelSubscription(subscriptionId: string): Promise<SubscriptionResponse> {
    try {
      const response = await fetch(`${this.backendUrl}/api/subscriptions/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ subscriptionId })
      });

      if (!response.ok) {
        throw new Error('Failed to cancel subscription');
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Cancellation failed: ${error}`);
    }
  }

  async getPricing(): Promise<any> {
    try {
      const response = await fetch(`${this.backendUrl}/api/pricing`);

      if (!response.ok) {
        throw new Error('Failed to fetch pricing');
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Failed to fetch pricing: ${error}`);
    }
  }
}