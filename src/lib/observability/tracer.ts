import {
  context,
  trace,
  SpanStatusCode,
  type Attributes,
} from "@opentelemetry/api";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown tracing error";
}

export async function withTraceSpan<T>(
  name: string,
  attributes: Attributes,
  fn: () => Promise<T>,
) {
  const tracer = trace.getTracer("olivia-phase1");
  const span = tracer.startSpan(name);

  Object.entries(attributes).forEach(([key, value]) => {
    if (value !== undefined) {
      span.setAttribute(key, value);
    }
  });

  return context.with(trace.setSpan(context.active(), span), async () => {
    try {
      const result = await fn();

      span.setStatus({ code: SpanStatusCode.OK });

      return result;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: getErrorMessage(error),
      });

      throw error;
    } finally {
      span.end();
    }
  });
}
