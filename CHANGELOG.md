# Changelog

## 0.3.0

- Classify API outcomes before decoding success payloads, so minimal `AlreadyExists` responses correctly produce the typed reason rather than a misleading schema/HTTP failure.
- Decode omitted branding entries as `Option.none()`, matching empty and partial branding objects returned by the API.
- Support invoice responses that put `chargeType` on individual charge items. `Charge.chargeType` is now an `Option`; `ChargeItem.chargeType` and `Charge.totalTax` are also exposed as `Option` values. This preserves both documented and observed provider response variants.
- Verify these shapes against an accepted sandbox order whose assets reached `Complete` and production reached `InProgress`.

## 0.2.0

- Upgrade to Effect `4.0.0-rc.112`; the peer range now requires RC.112 or newer within v4.
- Migrate to `Schema.TaggedError` and `Schema.Defect()`.
- Return decoded quotes for `CreatedWithIssues`, preserving top-level `issues` for callers to inspect. Prodigi uses this outcome for otherwise valid US quotes carrying its sales-tax warning. Order creation still reports `CreatedWithIssues` as a typed failure.
- Upgrade Bun, TypeScript, Vite+, and Effect testing tools. Vitest stays aligned with Vite+'s supported version.
