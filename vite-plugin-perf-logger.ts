/**
 * Vite plugin to log slow requests during development
 * Helps identify performance bottlenecks
 */
import type { Plugin } from 'vite';

interface RequestTiming {
  url: string;
  start: number;
  end?: number;
  duration?: number;
}

export function perfLogger(options: { threshold?: number } = {}): Plugin {
  const threshold = options.threshold || 500; // Log requests slower than 500ms
  const timings = new Map<string, RequestTiming>();

  return {
    name: 'perf-logger',
    apply: 'serve', // Only in dev mode

    configureServer(server) {
      // Intercept middleware to track request timing
      server.middlewares.use((req, res, next) => {
        const url = req.url || '';
        const start = Date.now();

        timings.set(url, { url, start });

        // Monkey-patch res.end to capture completion time
        const originalEnd = res.end.bind(res);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        res.end = function (...args: any[]) {
          const end = Date.now();
          const timing = timings.get(url);

          if (timing) {
            timing.end = end;
            timing.duration = end - timing.start;

            // Log slow requests
            if (timing.duration > threshold) {
              console.log(
                `⚠️  Slow request (${timing.duration}ms): ${url.substring(0, 100)}`
              );
            }

            timings.delete(url);
          }

          return originalEnd(...args);
        };

        next();
      });

      // Log summary every 30 seconds
      setInterval(() => {
        if (timings.size > 0) {
          console.log(`📊 ${timings.size} pending requests...`);
          const pending = Array.from(timings.values())
            .sort((a, b) => a.start - b.start)
            .slice(0, 5);

          pending.forEach((t) => {
            const elapsed = Date.now() - t.start;
            console.log(`  - ${t.url.substring(0, 80)} (${elapsed}ms elapsed)`);
          });
        }
      }, 30000);
    },

    // Log transform timing
    transform(code) {
      const start = Date.now();

      return {
        code,
        map: null,
        meta: {
          transformTime: Date.now() - start,
        },
      };
    },
  };
}
