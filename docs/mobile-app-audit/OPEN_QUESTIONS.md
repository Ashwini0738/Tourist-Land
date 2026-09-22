# Open Questions

## Product

1. Is the provider-free atlas intended as the final map experience?
2. Is the wallet intended to hold money, travel passes, rewards, or only branded trip content?
3. Which hotel/event supplier(s) will provide live inventory and reservation fulfillment?
4. What property verification/legal workflow is required before a listing is trusted?
5. Is account deletion required, and what retention/export rules apply?
6. Which roles and capabilities are allowed in the published customer app?

## Operations

7. Which environment is the release staging environment?
8. Who owns production Clerk, Stripe, Resend, DB, domain, signing, and rollback access?
9. What is the production database migration and backup process?
10. What are the required uptime, alerting, and incident-response targets?
11. What are the allowed origins for the mobile/admin API?

## QA

12. Which physical Android/iOS devices and OS versions are acceptance targets?
13. What are the expected offline and slow-network behaviors?
14. What are the payment, refund, supplier cancellation, and duplicate-payment acceptance cases?
15. What notification providers and delivery guarantees are required?
16. What accessibility standard and supported font scales are required?

## Technical contract

17. Are OpenAPI identity-link endpoints planned, obsolete, or missing implementation?
18. Should vendor mobile modules be completed in this app or handled in the admin web app?
19. What is the definitive TypeScript version policy across the workspace?
