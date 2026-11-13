# Eval run (2026-11-13T15:57:41.638Z, model claude-sonnet-5-5)

- Known errors found: **21/21** (21 by the AI, 0 only by the automatic checks)
- Calls with errors flagged (not "no issues"): 15/15
- Clean calls with no false alarm: **5/5**

## CALL-001: clean, AI says "needs-attention"

- no false alarms

## CALL-004: clean, AI says "no-issues-found"

- no false alarms

## CALL-005: clean, AI says "no-issues-found"

- no false alarms

## CALL-006: clean, AI says "no-issues-found"

- no false alarms

## CALL-007: clean, AI says "no-issues-found"

- no false alarms

## CALL-002: has errors, AI says "issues-found"

- [x] promise was £100, not £150
  - matched claim: contradicted: "The customer agreed to pay £150 through the online portal on 23 October;" (cites T16,T14)

## CALL-003: has errors, AI says "issues-found"

- [x] consent claimed but the customer refused
  - matched claim: contradicted: "Consent gained to record vulnerability." (cites T10,T11)
- [x] omits 'no money for food' hardship
  - matched ai issue: omission (Severe Hardship Specifics): Severe hardship specifics omitted: customer has no money for food and relied on sister's shopping. (cites T08)
- [x] states the £460 arrears amount
  - matched ai issue: rule-breach (Arrears/Balances): Specific numerical value of arrears must not be included. (cites T05)

## CALL-008: has errors, AI says "issues-found"

- [x] default notice never mentioned in the call
  - matched claim: unsupported: "The agent confirmed a default notice had been issued" (cites T07)

## CALL-009: has errors, AI says "issues-found"

- [x] I&E was postponed and booked, not refused
  - matched claim: contradicted: "The customer refused an I&E assessment scheduled for 21 October after 6 pm," (cites T12,T15)

## CALL-010: has errors, AI says "issues-found"

- [x] omits the cause: husband cancelled the DD in a divorce mix-up
  - matched ai issue: omission (Specificity (No Generalization)): The specific cause of non-payment is missing. The customer's husband cancelled the Direct Debit by mistake during their divorce while moving bills out of the joint account. The rules require specific causes to be reported. (cites T08,T10)

## CALL-011: has errors, AI says "issues-found"

- [x] missing 'customer signposted' (website support page)
  - matched ai issue: omission (Signposting): The agent directed the customer to the website support page, so the required phrase 'customer signposted' is missing. (cites T15)

## CALL-012: has errors, AI says "issues-found"

- [x] 'ongoing' Authority to Act; it was for this call only
  - matched claim: contradicted: "whose ongoing Authority to Act was verified," (cites T09,T08)

## CALL-013: has errors, AI says "issues-found"

- [x] 'Payment made' but no payment was taken
  - matched claim: contradicted: "Payment made;" (cites T23)
- note: Not scored: the agent asked for a payment (T11) and the customer said no (T12), which arguably should be recorded as a declined attempt.

## CALL-014: has errors, AI says "issues-found"

- [x] names the employer (Cedar Lane Distribution)
  - matched ai issue: rule-breach (Privacy (Entity Redaction)): The employer's name is a specific entity and should have been redacted, e.g. 'the new employer'. (cites T08)

## CALL-015: has errors, AI says "issues-found"

- [x] missing 'risk of further action' warning
  - matched ai issue: omission (Risk of Further Action): The agent explicitly warned the account is at risk of further action, which the rules require to be stated using the phrase 'risk of further action'. (cites T13,T15)

## CALL-016: has errors, AI says "issues-found"

- [x] states the £230 amount of the payment taken
  - matched ai issue: rule-breach (Immediate Payments): Rules forbid stating amounts for payments taken during the call; should simply say 'Payment made.' (cites T10)

## CALL-017: has errors, AI says "issues-found"

- [x] hold was fourteen days, not thirty
  - matched claim: contradicted: "A thirty-day hold on collection contact was applied;" (cites T19)
- [x] omits bereavement and frozen joint account
  - matched ai issue: omission (Severe Hardship Specifics): Severe hardship specifics are missing: bereavement of the customer's mother and the joint bank account frozen, so car money is inaccessible. The summary does not state the reason for non-payment. (cites T08,T06)

## CALL-018: has errors, AI says "issues-found"

- [x] Authority to Act was refused, not verified
  - matched claim: contradicted: "Authority to Act was verified for the partner" (cites T08,T22)
- [x] omits that the customer declined I&E
  - matched ai issue: omission (I&E Refusal): The customer declined an Income & Expenditure assessment; this is required to be stated. (cites T15,T16)

## CALL-019: has errors, AI says "issues-found"

- [x] says inbound; the agent made the call
  - matched claim: contradicted: "The customer called the company, and arrears were discussed." (cites T01)
- [x] missing 'Consent gained to record vulnerability'
  - matched ai issue: omission (Consent): Consent to record the vulnerability was gained but the required phrase 'Consent gained to record vulnerability' is missing. (cites T09,T10)

## CALL-020: has errors, AI says "issues-found"

- [x] £80 was explicitly not a promise
  - matched claim: contradicted: "the customer agreed to pay £80 on 23 October." (cites T16,T17)
- [x] missing 'risk of further action' warning
  - matched ai issue: omission (Risk of Further Action): Agent's explicit warning that the account remains at risk of further action is not stated; required phrase 'risk of further action'. (cites T19)
- note: Not scored: the £210 emergency-childcare cost (T10) arguably belongs in the summary under Situational Costs.
