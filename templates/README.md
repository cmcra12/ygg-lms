# Document templates

These are ordinary Word documents. Open them in Word, reword or restyle them
freely, and keep the `{placeholder}` fields where values should be filled in.
The app fills them when you click **Generate** on an application.

| File | Generated from |
|---|---|
| `credit-approval.docx` | Applications → Generate credit approval |
| `rental-contract.docx` | Applications → Generate rental contract |

## Available placeholders

| Placeholder | Value |
|---|---|
| `{generated_date}` | Today's date (DD/MM/YYYY, Sydney) |
| `{generated_by}` | Staff member generating the document |
| `{application_reference}` | e.g. APP-2026-0001 |
| `{customer_name}` / `{customer_abn}` / `{customer_acn}` / `{customer_address}` | Customer details |
| `{deal_value}` | Deal value ex GST, formatted |
| `{rr}` / `{roi}` | Rental rate and ROI (entered from the quote tools) |
| `{term_months}` | Term in months |
| `{brokerage}` | Brokerage ex GST, formatted |
| `{broker_name}` | Introducing broker (or "Direct") |

Asset list — repeat a block per asset by wrapping lines between `{#assets}`
and `{/assets}` (each on its own line). Inside the block you can use
`{description}`, `{vin}`, `{rego}`, `{serial}` and `{value_ex_gst}`.

To recreate the starter templates from scratch: `npx tsx scripts/make-templates.ts`.
