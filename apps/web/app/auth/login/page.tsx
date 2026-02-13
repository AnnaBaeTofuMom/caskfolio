export default function LoginPage() {
  return (
    <section>
      <h1>Login</h1>
      <form className="card form-grid">
        <label>
          Email
          <input type="email" placeholder="you@example.com" />
        </label>
        <label>
          Password
          <input type="password" placeholder="••••••••" />
        </label>
        <button className="btn primary" type="submit">
          Login
        </button>
        <button className="btn ghost" type="button">
          Continue with Google
        </button>
        <button className="btn ghost" type="button">
          Continue with Apple
        </button>
      </form>
    </section>
  );
}
