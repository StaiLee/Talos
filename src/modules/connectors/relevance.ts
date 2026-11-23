const domainRules: Record<string, RegExp> = {
  telephonie: /t[ée]l[ée]phon|trunk sip|voip|toip|ipbx|pabx|centrex|ucaas|rtc|num[ée]ris/i,
  internet: /fibre|ftth|ftto|ftte|acc[èe]s internet|tr[èe]s haut d[ée]bit|xDSL|sd[- ]?wan|mpls|vpn/i,
  wifi: /wi[- ]?fi|hotspot|borne[s]? sans fil/i,
  cybersecurite: /cyber|firewall|pare-feu|antivirus|edr|s[ée]curit[ée] informatique|infog[ée]rance/i,
  mobile: /t[ée]l[ée]phonie mobile|forfait[s]? (?:4g|5g)|forfait[s]? mobile|smartphone|carte[s]? sim|esim|terminaux mobiles|services? (?:de|voix.*)?mobiles?/i,
  videosurveillance: /vid[ée]osurveillance|vid[ée]oprotection|cam[ée]ra|t[ée]l[ée]surveillance/i,
  sauvegarde: /sauvegarde|backup as a service|baas/i,
};

export function detectDomains(value: string) {
  return Object.entries(domainRules).filter(([, pattern]) => pattern.test(value)).map(([domain]) => domain);
}

export function relevanceScore(value: string, domains: string[]) {
  if (domains.length === 0) return 10;
  let score = 44 + Math.min(domains.length * 10, 40);
  if (/telecom|t[ée]l[ée]communication|6421|6420|324121|3255/i.test(value)) score += 12;
  if (/migration|d[ée]ploiement|maintien en condition|op[ée]rateur|maintenance|interconnexion|raccordement/i.test(value)) score += 8;
  if (/impression|imprimante|photocopieur|b[âa]timent|voirie|d[ée]chet/i.test(value)) score -= 20;
  return Math.max(10, Math.min(96, score));
}

export function isNonCoreWork(title: string) {
  return /\bCSPS\b|coordination en mati[èe]re de s[ée]curit[ée]|travaux d'[ée]lectrification|travaux d'[ée]clairage|travaux alimentation|chauffage urbain|courant fort|campagnes de relances t[ée]l[ée]phoniques|accueil physique et t[ée]l[ée]phonique|[ée]quipements.*p[ée]dagogiques/i.test(title);
}
