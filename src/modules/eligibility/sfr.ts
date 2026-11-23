import { mkdir } from "node:fs/promises";
import path from "node:path";
import { Camoufox } from "camoufox";

type SfrAddress = {
  numeroVoie?: string;
  typeVoie?: string;
  nomVoie?: string;
  codePostal?: string;
  localite?: string;
};

type SfrOffer = {
  ng_offreLibelle?: string;
  techno?: string;
  libelle_techno?: string;
  sous_titre?: string;
};

export async function checkSfrEligibility(address: string, evidencePath: string) {
  const browser = await Camoufox({ headless: true, os: "linux" });
  try {
    const page = await browser.newPage();
    await page.goto("https://www.sfrbusiness.fr/internet/eligibilite-fibre/", { waitUntil: "domcontentloaded", timeout: 45_000 });
    const refuse = page.getByRole("button", { name: "Tout refuser" });
    if (await refuse.count()) await refuse.click();
    const addressResponse = page.waitForResponse((response) => response.url().includes("/getRaAdresseGouv"), { timeout: 30_000 });
    await page.locator('input[name="autoComplete-element"]').fill(address);
    const addresses = await (await addressResponse).json() as SfrAddress[];
    if (!addresses.length) return { status: "non_eligible", ftthEligible: false, fttoEligible: false, summary: "Adresse non reconnue par SFR", offers: [] };
    const found = addresses[0];
    const street = found.nomVoie?.toUpperCase().startsWith(`${found.typeVoie ?? ""} `.trim()) ? found.nomVoie : `${found.typeVoie ?? ""} ${found.nomVoie ?? ""}`;
    const label = `${found.numeroVoie ?? ""} ${street ?? ""} ${found.codePostal ?? ""} ${found.localite ?? ""}`.replace(/\s+/g, " ").trim().toUpperCase();
    await page.getByText(label, { exact: true }).first().click();
    const resultResponse = page.waitForResponse((response) => response.url().includes("/resultatAuto"), { timeout: 45_000 });
    await page.getByText("VALIDER", { exact: true }).click();
    const offers = await (await resultResponse).json() as SfrOffer[];
    const normalizedOffers = offers.map((offer) => ({ name: offer.ng_offreLibelle ?? "Offre SFR", technology: offer.techno ?? offer.libelle_techno ?? "À confirmer", description: offer.sous_titre }));
    const ftthEligible = offers.some((offer) => offer.techno === "FTTH" || /mutualis[ée]e/i.test(offer.libelle_techno ?? ""));
    const fttoEligible = offers.some((offer) => offer.techno === "FTTO" || /d[ée]di[ée]e/i.test(offer.libelle_techno ?? ""));
    await page.waitForURL(/offres/, { timeout: 15_000 });
    await mkdir(path.dirname(evidencePath), { recursive: true });
    await page.screenshot({ path: evidencePath, fullPage: false });
    const statuses = [ftthEligible ? "FTTH éligible" : "FTTH non proposée", fttoEligible ? "FTTO éligible" : "FTTO non proposée"];
    return { status: ftthEligible || fttoEligible ? "eligible" : "non_eligible", ftthEligible, fttoEligible, summary: statuses.join(" · "), offers: normalizedOffers };
  } finally {
    await browser.close();
  }
}
