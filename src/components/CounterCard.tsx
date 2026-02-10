import { useState } from 'react';

export default function CounterCard() {
  const [count, setCount] = useState(0);

  return (
    <section>
      <h1>Astro + React on Cloudflare Pages</h1>
      <p>This is a simple Astro app with an interactive React component.</p>
      <button type="button" onClick={() => setCount((value) => value + 1)}>
        Count: {count}
      </button>
    </section>
  );
}
