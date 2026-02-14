import { LoginForm } from '../../../components/auth/login-form';
import { PhoneVerificationForm } from '../../../components/auth/phone-verification-form';

export default function LoginPage() {
  return (
    <section>
      <h1>Login</h1>
      <LoginForm />
      <div style={{ height: 12 }} />
      <PhoneVerificationForm />
    </section>
  );
}
