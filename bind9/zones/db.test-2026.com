$TTL 3600
@   IN  SOA ns1.test-2026.com. admin.test-2026.com. (
        1       ; serial
        3600    ; refresh
        900     ; retry
        604800  ; expire
        3600    ; minimum
)

@   IN  NS  ns1.test-2026.com.
ns1 IN  A   127.0.0.1
