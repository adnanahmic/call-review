import { expect, test } from "@playwright/test";

// Happy path: makes ONE real AI review call (server cache makes repeats free).
test("reviewer runs an AI review, follows evidence and records a decision", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /CALL-003/ }).click();
  await expect(page.getByRole("heading", { name: "CALL-003" })).toBeVisible();

  await page.getByRole("button", { name: "Run AI review" }).click();
  await expect(page.getByTestId("overall")).toBeVisible({ timeout: 90_000 });
  await expect(
    page.getByRole("heading", { name: /Summary claims/ }),
  ).toBeVisible();

  const chip = page
    .getByRole("button", { name: /Show turn T\d+ in transcript/ })
    .first();
  await chip.click();
  await expect(page.locator("li[id^='turn-'].ring-yellow-500")).toHaveCount(1);

  await page.getByRole("radio", { name: "Needs correction" }).check();
  await page.getByRole("button", { name: "Save decision" }).click();
  await expect(page.getByText("Saved: Needs correction.")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Calls" })).toContainText(
    "1 of 20 decided",
  );
});
