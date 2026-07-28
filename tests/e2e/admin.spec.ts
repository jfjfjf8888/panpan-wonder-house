import { expect, test } from "@playwright/test";

test("错误密码登录失败", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("用户名").fill("admin");
  await page.getByLabel("密码").fill("wrong-password");
  await page.getByRole("button", { name: "登录" }).click();
  await expect(page.getByText("用户名或密码错误")).toBeVisible();
});

test("管理员可以登录后台", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("用户名").fill(process.env.ADMIN_USERNAME || "admin");
  await page.getByLabel("密码").fill(process.env.ADMIN_PASSWORD || "admin123456");
  await page.getByRole("button", { name: "登录" }).click();
  await expect(page.getByRole("heading", { name: "仪表盘" })).toBeVisible({
    timeout: 15000,
  });
});

test("未登录访问后台被拦截", async ({ page }) => {
  await page.goto("/admin/games");
  await expect(page).toHaveURL(/admin\/login/);
});
