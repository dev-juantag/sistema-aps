const RAW_DATA = `
TERRITORIO DEL CAFE 1 (T01)
TERRITORIO DEL CAFE 2 (T02)
TERRITORIO DEL CAFE 3 (T03)
TERRITORIO DEL CAFE 4 (T04)
RIO DEL OTUN 1 (T05)
RIO DEL OTUN 2 (T06)
RIO DEL OTUN 3 (T07)
RIO DEL OTUN 4 (T08)
CONSOTA 1 (T09)
CONSOTA 2 (T10)
SAN JOAQUIN 1 (T11)
SAN JOAQUIN 2 (T12)
SAN JOAQUIN 3 (T13)
SAN JOAQUIN 4 (T14)
SAN JOAQUIN 5 (T15)
CUBA 1 (T16)
CUBA 2 (T17)
CUBA 3 (T18)
OSO 1 (T19)
OSO 2 (T20)
OSO 3 (T21)
BOSTON 1 (T22)
CUBA 4 (T23)
POBLADO 1 (T24)
POBLADO 2 (T25)
VILLAVICENCIO (ITINERANTE) (T26)
ORIENTE (T27)
SAN NICOLAS 1 (T28)
PERLA DEL OTUN 1 (T30)
CORREGIMIENTO ARABIA (T31)
ALTA GRACIA (T32)
LA BELLA (T33)
LA FLORIDA (T34)
TRIBUNAS (T35)
COMBIA BAJA (T36)
COMBIA ALTA (T37)
ESTRELLA LA PALMILLA (T38)
MORELIA (ITINERANTE) (T39)
ITINERANTES Indigena (T41)
VILLA SANTANA (T42)
CARCEL LA 40 (T43)
`

async function main() {
  const lines = RAW_DATA.trim().split('\n')
  let success = 0;
  for (const line of lines) {
    const match = line.match(/(.+?)\s+\((T\d+)\)/)
    if (match) {
      const nombre = match[1].trim()
      const codigo = match[2].trim()
      
      const res = await fetch("http://localhost:3000/api/territorios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo, nombre })
      });
      const data = await res.json();
      if (!res.ok && data.error !== 'Ya existe un territorio con este código') {
        console.error("Failed to seed:", codigo, data.error);
      } else {
        success++;
      }
    }
  }
  console.log("Seeded " + success + " territories successfully via API.");
}

main().catch(console.error)
