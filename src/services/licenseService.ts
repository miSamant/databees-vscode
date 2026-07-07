import * as vscode from 'vscode';

export interface LicenseData {
  type: 'free' | 'trial' | 'premium';
  startDate: string;
  endDate: string;
  status: 'active' | 'expired';
  subscriptionId?: string;
  customerEmail?: string;
}

const LICENSE_STORAGE_KEY = 'databees:license';
const TRIAL_DAYS = 30;

export class LicenseService {
  private context: vscode.ExtensionContext;
  private licenseData: LicenseData | null = null;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.loadLicense();
  }

  private loadLicense(): void {
    this.licenseData = this.context.globalState.get<LicenseData>(LICENSE_STORAGE_KEY) || null;
  }

  async checkLicense(): Promise<boolean> {
    if (!this.licenseData) {
      await this.startTrial();
      return true;
    }

    const endDate = new Date(this.licenseData.endDate);
    const now = new Date();

    if (now > endDate) {
      this.licenseData.status = 'expired';
      await this.saveLicense();
      return false;
    }

    // If premium, verify with backend
    if (this.licenseData.type === 'premium') {
      try {
        const isValid = await this.verifyWithBackend(this.licenseData.subscriptionId!);
        return isValid;
      } catch (error) {
        console.error('Failed to verify premium license:', error);
        // Allow local use even if backend unreachable
        return true;
      }
    }

    return this.licenseData.status === 'active';
  }

  private async startTrial(): Promise<void> {
    const trialStart = new Date();
    const trialEnd = new Date(trialStart.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

    this.licenseData = {
      type: 'trial',
      startDate: trialStart.toISOString(),
      endDate: trialEnd.toISOString(),
      status: 'active'
    };

    await this.saveLicense();

    vscode.window.showInformationMessage(
      `🐝 Welcome to DataBees! You have a 30-day free trial. Enjoy unlimited connections and features!`,
      'Learn More'
    ).then(selection => {
      if (selection === 'Learn More') {
        vscode.env.openExternal(vscode.Uri.parse('https://databees.app'));
      }
    });
  }

  async activatePremium(subscriptionId: string, customerEmail: string): Promise<void> {
    const now = new Date();
    const expiryDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    this.licenseData = {
      type: 'premium',
      startDate: now.toISOString(),
      endDate: expiryDate.toISOString(),
      status: 'active',
      subscriptionId,
      customerEmail
    };

    await this.saveLicense();
    vscode.window.showInformationMessage('🎉 Premium activated! Thank you for subscribing to DataBees!');
  }

  private async verifyWithBackend(subscriptionId: string): Promise<boolean> {
    // This will call your backend to verify the subscription
    try {
      const response = await fetch('https://api.databees.app/verify-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId })
      });

      if (!response.ok) {
        return false;
      }

      const data: any = await response.json();
      return data.valid === true;
    } catch (error) {
      console.error('Backend verification failed:', error);
      return true; // Allow graceful degradation
    }
  }

  async openPaymentPage(): Promise<void> {
    const userEmail = await vscode.window.showInputBox({
      placeHolder: 'your-email@example.com',
      prompt: 'Enter your email for checkout'
    });

    if (!userEmail) return;

    const checkoutUrl = `https://databees.app/checkout?email=${encodeURIComponent(userEmail)}`;
    vscode.env.openExternal(vscode.Uri.parse(checkoutUrl));
  }

  getTrialRemainingDays(): number {
    if (!this.licenseData) return TRIAL_DAYS;

    const endDate = new Date(this.licenseData.endDate);
    const now = new Date();
    const diffTime = Math.abs(endDate.getTime() - now.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
  }

  isTrialExpired(): boolean {
    if (!this.licenseData) return false;
    return this.licenseData.status === 'expired';
  }

  isPremium(): boolean {
    return this.licenseData?.type === 'premium' && this.licenseData.status === 'active';
  }

  private async saveLicense(): Promise<void> {
    if (this.licenseData) {
      await this.context.globalState.update(LICENSE_STORAGE_KEY, this.licenseData);
    }
  }
}