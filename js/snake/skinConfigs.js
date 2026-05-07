/* ==========================================================================
   snake/skinConfigs.js
   Configuração central das skins da cobra.
   Cada skin está comentada para facilitar mudanças rápidas na defesa.
   ========================================================================== */

export const SNAKE_SKINS = [
  {
    // ── SKIN COMPLEXA: Cobra Egípcia / Faraó ──
    // Cobra dourada com toucado nemes, Olho de Hórus e hieróglifos.
    // GUIA DE EDIÇÃO:
    // - headColor/bodyColor: cor do ouro (mais claro cabeça, mais escuro corpo)
    // - eyeColor: cor dos olhos da uraeus (turquesa)
    // - tongueColor: cor do ankh
    id: 'egyptian',
    name: 'Cobra Faraó',
    headColor:     0xFFD700,   // ouro puro
    bodyColor:     0xB8860B,   // ouro escuro
    headEmissive:  0x997700,   // brilho dourado
    bodyEmissive:  0x665500,   // brilho corpo
    eyeColor:      0x30D5C8,   // turquesa (uraeus)
    tongueColor:   0xFFD700,   // ouro (ankh)
  },
  {
    // Skin avançada: dragão chinês com chifres, crista e cauda dedicada.
    // GUIA DE EDIÇÃO EXTRA (dragão):
    // - hornColor: cor dos chifres
    // - spineColor: cor das espinhas dorsais/cauda
    id: 'cyber-green',
    name: 'Chinese Dragon',
    headColor: 0x00ff88,
    bodyColor: 0x00cc66,
    headEmissive: 0x00aa44,
    bodyEmissive: 0x008833,
    eyeColor: 0xff2222,
    tongueColor: 0xff2222,
    hornColor: 0xffcc00,
    spineColor: 0xffcc00,
  },
  {
    // ── SKIN COMPLEXA: Cobra Viking ──
    // Cobra de madeira entalhada com capacete de chifres e runas nórdicas.
    // GUIA DE EDIÇÃO:
    // - headColor: cor da madeira escura (cabeça)
    // - bodyColor: cor da madeira média (corpo)
    // - eyeColor: cor âmbar dos olhos runa
    // - accentColor: cor dos detalhes âmbar (frisos, anéis)
    id: 'viking',
    name: 'Cobra Viking',
    headColor:     0x5C3A1E,   // carvalho escuro
    bodyColor:     0x8B5E3C,   // carvalho médio
    headEmissive:  0x1a0d05,   // brilho subtil madeira
    bodyEmissive:  0x150a03,   // brilho subtil corpo
    eyeColor:      0xC68B2F,   // âmbar
    tongueColor:   0xC68B2F,   // âmbar (não usado, viking sem língua)
    accentColor:   0xC68B2F,   // frisos e detalhes
  },
  {
    // ── SKIN COMPLEXA: Samurai Mecha ──
    // Cobra-robô com armadura samurai, visor LED e katana nas costas.
    // GUIA DE EDIÇÃO:
    // - headColor/bodyColor: cor da armadura metálica
    // - eyeColor: cor do visor LED e luzes (vermelho sangue)
    // - accentColor: cor dos detalhes dourados (crista, tsuba, sobrancelhas)
    // - bladeColor: cor da lâmina da katana
    id: 'samurai-mecha',
    name: 'Samurai Mecha',
    headColor:     0x2a2a3a,
    bodyColor:     0x222233,
    headEmissive:  0x1a1a2e,
    bodyEmissive:  0x151528,
    eyeColor:      0xff1744,
    tongueColor:   0xff1744,
    accentColor:   0xd4a017,
    bladeColor:    0xc0c8d4,
  },
  {
    // ── SKIN COMPLEXA: Serpente Infernal ──
    // Cobra demoníaca com chifres, mandíbula aberta, lava e cauda tridente.
    // GUIA DE EDIÇÃO:
    // - headColor/bodyColor: cor da pele escura (obsidiana)
    // - lavaColor: cor das fissuras de lava (laranja incandescente)
    // - eyeColor: cor dos olhos flamejantes
    // - hornColor: cor dos chifres demoníacos
    // - fangColor: cor das presas
    id: 'infernal',
    name: 'Serpente Infernal',
    headColor:     0x1a0a0a,
    bodyColor:     0x150808,
    headEmissive:  0x880000,
    bodyEmissive:  0x660000,
    eyeColor:      0xffaa00,
    tongueColor:   0xff6600,
    lavaColor:     0xff6600,
    hornColor:     0x440000,
    fangColor:     0xddc8a0,
  },
];
