import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
for(const variant of ['A','B','Non'])for(const width of [375,900])test(`courriel ${variant} à ${width}px`,async({page},testInfo)=>{
 await page.setViewportSize({width,height:1000});
 await page.setContent(readFileSync(new URL(`../docs/email-previews/${variant}.html`,import.meta.url),'utf8'));
 await expect(page.getByRole('heading',{level:1})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:testInfo.outputPath('email.png'),fullPage:true});
});
