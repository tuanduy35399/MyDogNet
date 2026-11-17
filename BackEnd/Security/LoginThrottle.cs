namespace BackEnd.Security;
// Single-instance limiter: bounded memory, sliding window, one lock for atomic admission.
public sealed class LoginThrottle
{
    private readonly Dictionary<string, Queue<DateTimeOffset>> entries = new();
    private readonly object gate = new();
    public bool Admit(string ip, out int retryAfter)
    {
        lock (gate)
        {
            var now = DateTimeOffset.UtcNow;
            foreach (var key in entries.Keys.ToArray())
            {
                var queue = entries[key];
                while (queue.TryPeek(out var time) && time <= now.AddSeconds(-60)) queue.Dequeue();
                if (queue.Count == 0) entries.Remove(key);
            }
            retryAfter = 60;
            if (!entries.TryGetValue(ip, out var attempts))
            {
                if (entries.Count >= 10000) return false;
                entries[ip] = attempts = new Queue<DateTimeOffset>();
            }
            if (attempts.Count >= 20)
            {
                retryAfter = Math.Max(1, (int)Math.Ceiling((attempts.Peek().AddSeconds(60) - now).TotalSeconds));
                return false;
            }
            attempts.Enqueue(now);
            return true;
        }
    }
}
public sealed class LoginThrottleMiddleware
{
    private readonly RequestDelegate next;
    public LoginThrottleMiddleware(RequestDelegate next) => this.next = next;
    public async Task InvokeAsync(HttpContext context, LoginThrottle throttle, ILogger<LoginThrottleMiddleware> logger)
    {
        if (HttpMethods.IsPost(context.Request.Method) && string.Equals(context.Request.Path.Value?.TrimEnd('/'), "/Account/signIn", StringComparison.OrdinalIgnoreCase))
        {
            var ip = context.Connection.RemoteIpAddress?.MapToIPv6().ToString() ?? "unknown";
            if (!throttle.Admit(ip, out var wait))
            {
                logger.LogWarning("Login IP limit exceeded");
                context.Response.StatusCode = 429;
                context.Response.Headers.RetryAfter = wait.ToString();
                await context.Response.WriteAsJsonAsync(new { message = "Vui lòng chờ trước khi đăng nhập lại." });
                return;
            }
        }
        await next(context);
    }
}
