import { PrismaClient, RoleType, MerchantTypeEnum, MemberCondition, StallStatus, MerchantStatus, Periodicity, ObligationStatus, PaymentMethod, CashRegisterStatus, CashMovementType, SessionStatus, TicketStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Lista oficial de 107 socios del Mercado de Abastos Micaela Bastidas (Padrón 2026)
const officialSociosData = [
  {
    "num": 1,
    "internalCode": "MB-COM-00001",
    "firstName": "TABITA YNES",
    "lastName": "ALDERETE VELASQUEZ",
    "dni": "20119761",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-001",
    "sectorCode": "SEC-A",
    "businessCategory": "Carnes y Aves",
    "observations": null
  },
  {
    "num": 2,
    "internalCode": "MB-COM-00002",
    "firstName": "LIZBETH GIANINA",
    "lastName": "ALVAREZ CRISTOBAL",
    "dni": "70395045",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-002",
    "sectorCode": "SEC-A",
    "businessCategory": "Carnes y Aves",
    "observations": null
  },
  {
    "num": 3,
    "internalCode": "MB-COM-00003",
    "firstName": "JHONATAN",
    "lastName": "ARIAS GALVAN",
    "dni": "46386473",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-003",
    "sectorCode": "SEC-A",
    "businessCategory": "Carnes y Aves",
    "observations": null
  },
  {
    "num": 4,
    "internalCode": "MB-COM-00004",
    "firstName": "MARITZA LUZMILA",
    "lastName": "ARTEAGA YURIVILCA",
    "dni": "40153193",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-004",
    "sectorCode": "SEC-A",
    "businessCategory": "Carnes y Aves",
    "observations": null
  },
  {
    "num": 5,
    "internalCode": "MB-COM-00005",
    "firstName": "FORTUNATA",
    "lastName": "ARTICA DE CERRÓN",
    "dni": "19848218",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-005",
    "sectorCode": "SEC-A",
    "businessCategory": "Carnes y Aves",
    "observations": null
  },
  {
    "num": 6,
    "internalCode": "MB-COM-00006",
    "firstName": "MAGLORIA",
    "lastName": "ARZAPALO YALI",
    "dni": "20884719",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-006",
    "sectorCode": "SEC-A",
    "businessCategory": "Carnes y Aves",
    "observations": null
  },
  {
    "num": 7,
    "internalCode": "MB-COM-00007",
    "firstName": "VICTORIA MÁXIMA",
    "lastName": "ASTO CCENTE",
    "dni": "21269103",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-007",
    "sectorCode": "SEC-A",
    "businessCategory": "Carnes y Aves",
    "observations": null
  },
  {
    "num": 8,
    "internalCode": "MB-COM-00008",
    "firstName": "ISIDORA",
    "lastName": "ASTO DE MENDOZA",
    "dni": "19892783",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-008",
    "sectorCode": "SEC-A",
    "businessCategory": "Carnes y Aves",
    "observations": null
  },
  {
    "num": 9,
    "internalCode": "MB-COM-00009",
    "firstName": "FLORENCIA",
    "lastName": "AYLLÓN SERVA",
    "dni": "19839679",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-009",
    "sectorCode": "SEC-A",
    "businessCategory": "Carnes y Aves",
    "observations": null
  },
  {
    "num": 10,
    "internalCode": "MB-COM-00010",
    "firstName": "ELIZAMA HERLINDA",
    "lastName": "BARAHONA MIGUEL",
    "dni": "42781068",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-010",
    "sectorCode": "SEC-A",
    "businessCategory": "Carnes y Aves",
    "observations": null
  },
  {
    "num": 11,
    "internalCode": "MB-COM-00011",
    "firstName": "AYRA",
    "lastName": "BARZOLA BERNUY",
    "dni": "20093891",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-011",
    "sectorCode": "SEC-A",
    "businessCategory": "Carnes y Aves",
    "observations": null
  },
  {
    "num": 12,
    "internalCode": "MB-COM-00012",
    "firstName": "SILVIA ROSALÍA",
    "lastName": "BASTIDAS RAMÍREZ",
    "dni": "20057738",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-012",
    "sectorCode": "SEC-A",
    "businessCategory": "Carnes y Aves",
    "observations": null
  },
  {
    "num": 13,
    "internalCode": "MB-COM-00013",
    "firstName": "SILVERIA TOMASA",
    "lastName": "BONIFACIO CACHUAY",
    "dni": "16132991",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-013",
    "sectorCode": "SEC-A",
    "businessCategory": "Carnes y Aves",
    "observations": null
  },
  {
    "num": 14,
    "internalCode": "MB-COM-00014",
    "firstName": "AIDA LILIA",
    "lastName": "CARLOS TOCAS",
    "dni": "19845901",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-014",
    "sectorCode": "SEC-A",
    "businessCategory": "Carnes y Aves",
    "observations": null
  },
  {
    "num": 15,
    "internalCode": "MB-COM-00015",
    "firstName": "EDITH",
    "lastName": "CARRASCO ROJAS DE TIZA",
    "dni": "41671307",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-015",
    "sectorCode": "SEC-A",
    "businessCategory": "Carnes y Aves",
    "observations": null
  },
  {
    "num": 16,
    "internalCode": "MB-COM-00016",
    "firstName": "KIMBERLY PAMELA",
    "lastName": "CCAPA MALDONADO",
    "dni": "71740903",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-016",
    "sectorCode": "SEC-A",
    "businessCategory": "Carnes y Aves",
    "observations": null
  },
  {
    "num": 17,
    "internalCode": "MB-COM-00017",
    "firstName": "MAGALY",
    "lastName": "CASTILLÓN SIUCE",
    "dni": "42241717",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-017",
    "sectorCode": "SEC-A",
    "businessCategory": "Carnes y Aves",
    "observations": null
  },
  {
    "num": 18,
    "internalCode": "MB-COM-00018",
    "firstName": "LESLY EVELYN",
    "lastName": "CERVANTES CHILENO",
    "dni": "77805419",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-018",
    "sectorCode": "SEC-A",
    "businessCategory": "Carnes y Aves",
    "observations": null
  },
  {
    "num": 19,
    "internalCode": "MB-COM-00019",
    "firstName": "YOLANDA RUTH",
    "lastName": "CHILENO HUAYNALAYA",
    "dni": "20055678",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-019",
    "sectorCode": "SEC-A",
    "businessCategory": "Carnes y Aves",
    "observations": null
  },
  {
    "num": 20,
    "internalCode": "MB-COM-00020",
    "firstName": "DONY EVELINA",
    "lastName": "CHILQUILLO MACHUCA",
    "dni": "20127656",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-020",
    "sectorCode": "SEC-A",
    "businessCategory": "Carnes y Aves",
    "observations": null
  },
  {
    "num": 21,
    "internalCode": "MB-COM-00021",
    "firstName": "PRICILIO",
    "lastName": "CÓNDOR VILLALVA",
    "dni": "19813214",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-021",
    "sectorCode": "SEC-A",
    "businessCategory": "Carnes y Aves",
    "observations": null
  },
  {
    "num": 22,
    "internalCode": "MB-COM-00022",
    "firstName": "HEDDY",
    "lastName": "CONDORÍ SEDANO",
    "dni": "41027349",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-022",
    "sectorCode": "SEC-A",
    "businessCategory": "Carnes y Aves",
    "observations": null
  },
  {
    "num": 23,
    "internalCode": "MB-COM-00023",
    "firstName": "LEOGIVILDO",
    "lastName": "CRISPIN TAYPE",
    "dni": "45472119",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-023",
    "sectorCode": "SEC-A",
    "businessCategory": "Carnes y Aves",
    "observations": null
  },
  {
    "num": 24,
    "internalCode": "MB-COM-00024",
    "firstName": "DORCAS ISABEL",
    "lastName": "CUICAPUSA HUARCAYA",
    "dni": "20028017",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-024",
    "sectorCode": "SEC-A",
    "businessCategory": "Carnes y Aves",
    "observations": null
  },
  {
    "num": 25,
    "internalCode": "MB-COM-00025",
    "firstName": "HILDA",
    "lastName": "CUICAPUSA HUARCAYA",
    "dni": "20052572",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-025",
    "sectorCode": "SEC-A",
    "businessCategory": "Carnes y Aves",
    "observations": null
  },
  {
    "num": 26,
    "internalCode": "MB-COM-00026",
    "firstName": "SILVIA HERLINDA",
    "lastName": "DE LA CRUZ PAMPAS",
    "dni": "20405583",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-026",
    "sectorCode": "SEC-A",
    "businessCategory": "Carnes y Aves",
    "observations": null
  },
  {
    "num": 27,
    "internalCode": "MB-COM-00027",
    "firstName": "CLEMENCIA ANA",
    "lastName": "ESTEBAN LLACSA",
    "dni": "19836345",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-027",
    "sectorCode": "SEC-A",
    "businessCategory": "Carnes y Aves",
    "observations": null
  },
  {
    "num": 28,
    "internalCode": "MB-COM-00028",
    "firstName": "GLORIA ADELA",
    "lastName": "FLORES VILLAVERDE",
    "dni": "19995621",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-028",
    "sectorCode": "SEC-B",
    "businessCategory": "Frutas y Verduras",
    "observations": null
  },
  {
    "num": 29,
    "internalCode": "MB-COM-00029",
    "firstName": "LUZ REBECA",
    "lastName": "GALVÁN VÍLCHEZ",
    "dni": "20097664",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-029",
    "sectorCode": "SEC-B",
    "businessCategory": "Frutas y Verduras",
    "observations": null
  },
  {
    "num": 30,
    "internalCode": "MB-COM-00030",
    "firstName": "CARMEN MERCEDES",
    "lastName": "GAMARRA RAMOS",
    "dni": "19891347",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-030",
    "sectorCode": "SEC-B",
    "businessCategory": "Frutas y Verduras",
    "observations": null
  },
  {
    "num": 31,
    "internalCode": "MB-COM-00031",
    "firstName": "DORIS",
    "lastName": "GARCIA ACUÑA",
    "dni": "21271301",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-031",
    "sectorCode": "SEC-B",
    "businessCategory": "Frutas y Verduras",
    "observations": null
  },
  {
    "num": 32,
    "internalCode": "MB-COM-00032",
    "firstName": "MARGATIRA",
    "lastName": "GARCIA ACUÑA",
    "dni": "21270275",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-032",
    "sectorCode": "SEC-B",
    "businessCategory": "Frutas y Verduras",
    "observations": null
  },
  {
    "num": 33,
    "internalCode": "MB-COM-00033",
    "firstName": "FREDDY EMERSON",
    "lastName": "GARCÍA COCA",
    "dni": "20122038",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-033",
    "sectorCode": "SEC-B",
    "businessCategory": "Frutas y Verduras",
    "observations": null
  },
  {
    "num": 34,
    "internalCode": "MB-COM-00034",
    "firstName": "JULIA",
    "lastName": "GÓMEZ ROMERO",
    "dni": "80151899",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-034",
    "sectorCode": "SEC-B",
    "businessCategory": "Frutas y Verduras",
    "observations": null
  },
  {
    "num": 35,
    "internalCode": "MB-COM-00035",
    "firstName": "DOMOLA",
    "lastName": "GONGORA QUISPE",
    "dni": "19863262",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-035",
    "sectorCode": "SEC-B",
    "businessCategory": "Frutas y Verduras",
    "observations": null
  },
  {
    "num": 36,
    "internalCode": "MB-COM-00036",
    "firstName": "RAYDA ALEJANDRA",
    "lastName": "GUTIÉRREZ VDA. DE MENDOZA",
    "dni": "19802754",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-036",
    "sectorCode": "SEC-B",
    "businessCategory": "Frutas y Verduras",
    "observations": null
  },
  {
    "num": 37,
    "internalCode": "MB-COM-00037",
    "firstName": "AQUILES ANTONIO",
    "lastName": "HINOSTROZA RUEDA",
    "dni": "20692805",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-037",
    "sectorCode": "SEC-B",
    "businessCategory": "Frutas y Verduras",
    "observations": null
  },
  {
    "num": 38,
    "internalCode": "MB-COM-00038",
    "firstName": "ELBER",
    "lastName": "HUAMANÍ MEZA",
    "dni": "20028524",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-038",
    "sectorCode": "SEC-B",
    "businessCategory": "Frutas y Verduras",
    "observations": null
  },
  {
    "num": 39,
    "internalCode": "MB-COM-00039",
    "firstName": "FELICIANA",
    "lastName": "HUAMANÍ MEZA",
    "dni": "20051895",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-039",
    "sectorCode": "SEC-B",
    "businessCategory": "Frutas y Verduras",
    "observations": null
  },
  {
    "num": 40,
    "internalCode": "MB-COM-00040",
    "firstName": "ANA ALIDA",
    "lastName": "HUARINGA JINES",
    "dni": "20012197",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-040",
    "sectorCode": "SEC-B",
    "businessCategory": "Frutas y Verduras",
    "observations": null
  },
  {
    "num": 41,
    "internalCode": "MB-COM-00041",
    "firstName": "HEYDDY IRIS",
    "lastName": "HURTADO ROMERO",
    "dni": "44889363",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-041",
    "sectorCode": "SEC-B",
    "businessCategory": "Frutas y Verduras",
    "observations": null
  },
  {
    "num": 42,
    "internalCode": "MB-COM-00042",
    "firstName": "MARCELINA",
    "lastName": "JURADO QUISPE",
    "dni": "20079126",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-042",
    "sectorCode": "SEC-B",
    "businessCategory": "Frutas y Verduras",
    "observations": null
  },
  {
    "num": 43,
    "internalCode": "MB-COM-00043",
    "firstName": "YOVANA ERNESTINA",
    "lastName": "LAURA FLORES",
    "dni": "40350496",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-043",
    "sectorCode": "SEC-B",
    "businessCategory": "Frutas y Verduras",
    "observations": null
  },
  {
    "num": 44,
    "internalCode": "MB-COM-00044",
    "firstName": "MARIBEL FÁTIMA",
    "lastName": "LAZO REYES",
    "dni": "19801537",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-044",
    "sectorCode": "SEC-B",
    "businessCategory": "Frutas y Verduras",
    "observations": null
  },
  {
    "num": 45,
    "internalCode": "MB-COM-00045",
    "firstName": "RAUL",
    "lastName": "LAZO REYES",
    "dni": "19843280",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-045",
    "sectorCode": "SEC-B",
    "businessCategory": "Frutas y Verduras",
    "observations": null
  },
  {
    "num": 46,
    "internalCode": "MB-COM-00046",
    "firstName": "EUGENIA ENTUSA",
    "lastName": "LEÓN DE HURTADO",
    "dni": "21279978",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-046",
    "sectorCode": "SEC-B",
    "businessCategory": "Frutas y Verduras",
    "observations": null
  },
  {
    "num": 47,
    "internalCode": "MB-COM-00047",
    "firstName": "ROGELIO IGNACIO",
    "lastName": "LÓPEZ HUAMAN",
    "dni": "19883460",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-047",
    "sectorCode": "SEC-B",
    "businessCategory": "Frutas y Verduras",
    "observations": null
  },
  {
    "num": 48,
    "internalCode": "MB-COM-00048",
    "firstName": "CAMILA",
    "lastName": "LOZANO TORRES",
    "dni": "19994775",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-048",
    "sectorCode": "SEC-B",
    "businessCategory": "Frutas y Verduras",
    "observations": null
  },
  {
    "num": 49,
    "internalCode": "MB-COM-00049",
    "firstName": "ELOY MARIANO",
    "lastName": "LUIS GALLARDO",
    "dni": "20087969",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-049",
    "sectorCode": "SEC-B",
    "businessCategory": "Frutas y Verduras",
    "observations": null
  },
  {
    "num": 50,
    "internalCode": "MB-COM-00050",
    "firstName": "AUSSY GARDENIA",
    "lastName": "LUIS MARTICORENA",
    "dni": "20073695",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-050",
    "sectorCode": "SEC-B",
    "businessCategory": "Frutas y Verduras",
    "observations": null
  },
  {
    "num": 51,
    "internalCode": "MB-COM-00051",
    "firstName": "UDALIA",
    "lastName": "MARCELO DE CORTEZ",
    "dni": "19993410",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-051",
    "sectorCode": "SEC-B",
    "businessCategory": "Frutas y Verduras",
    "observations": null
  },
  {
    "num": 52,
    "internalCode": "MB-COM-00052",
    "firstName": "YOHANA MERCEDES",
    "lastName": "MARTICORENA BENAVENTE",
    "dni": "20670271",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-052",
    "sectorCode": "SEC-B",
    "businessCategory": "Frutas y Verduras",
    "observations": null
  },
  {
    "num": 53,
    "internalCode": "MB-COM-00053",
    "firstName": "JOSE CARLOS",
    "lastName": "MATOS MONDARGO",
    "dni": "48407208",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-053",
    "sectorCode": "SEC-B",
    "businessCategory": "Frutas y Verduras",
    "observations": null
  },
  {
    "num": 54,
    "internalCode": "MB-COM-00054",
    "firstName": "SONIA",
    "lastName": "MATOS VILLAZANA",
    "dni": "20042885",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-054",
    "sectorCode": "SEC-B",
    "businessCategory": "Frutas y Verduras",
    "observations": null
  },
  {
    "num": 55,
    "internalCode": "MB-COM-00055",
    "firstName": "GABRIELA JHOSELIN",
    "lastName": "MEDINA ORIHUELA",
    "dni": "70041842",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-055",
    "sectorCode": "SEC-C",
    "businessCategory": "Abarrotes y Granos",
    "observations": null
  },
  {
    "num": 56,
    "internalCode": "MB-COM-00056",
    "firstName": "AYDA",
    "lastName": "MENDOZA ASTO",
    "dni": "20047549",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-056",
    "sectorCode": "SEC-C",
    "businessCategory": "Abarrotes y Granos",
    "observations": null
  },
  {
    "num": 57,
    "internalCode": "MB-COM-00057",
    "firstName": "CARMEN KARINA",
    "lastName": "MENDOZA ASTO",
    "dni": "40061246",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-057",
    "sectorCode": "SEC-C",
    "businessCategory": "Abarrotes y Granos",
    "observations": null
  },
  {
    "num": 58,
    "internalCode": "MB-COM-00058",
    "firstName": "MARISOL MAKRINA",
    "lastName": "MENDOZA BENDEZU",
    "dni": "40078108",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-058",
    "sectorCode": "SEC-C",
    "businessCategory": "Abarrotes y Granos",
    "observations": null
  },
  {
    "num": 59,
    "internalCode": "MB-COM-00059",
    "firstName": "GALINA VICENTA",
    "lastName": "MEZA SCHWARTZ",
    "dni": "20040608",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-059",
    "sectorCode": "SEC-C",
    "businessCategory": "Abarrotes y Granos",
    "observations": null
  },
  {
    "num": 60,
    "internalCode": "MB-COM-00060",
    "firstName": "TEODOSIA",
    "lastName": "MOLINA DE GASPAR",
    "dni": "19881249",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-060",
    "sectorCode": "SEC-C",
    "businessCategory": "Abarrotes y Granos",
    "observations": null
  },
  {
    "num": 61,
    "internalCode": "MB-COM-00061",
    "firstName": "ALEJA",
    "lastName": "MONTES DE ARAUJO",
    "dni": "19953627",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-061",
    "sectorCode": "SEC-C",
    "businessCategory": "Abarrotes y Granos",
    "observations": null
  },
  {
    "num": 62,
    "internalCode": "MB-COM-00062",
    "firstName": "DELIA",
    "lastName": "MORALES LAZO",
    "dni": "43777541",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-062",
    "sectorCode": "SEC-C",
    "businessCategory": "Abarrotes y Granos",
    "observations": null
  },
  {
    "num": 63,
    "internalCode": "MB-COM-00063",
    "firstName": "OSCAR RAUL",
    "lastName": "ÑAUPARI CAPCHA",
    "dni": "20682664",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-063",
    "sectorCode": "SEC-C",
    "businessCategory": "Abarrotes y Granos",
    "observations": null
  },
  {
    "num": 64,
    "internalCode": "MB-COM-00064",
    "firstName": "CARLOS YOEL",
    "lastName": "ÑAUPARI TICSE",
    "dni": "44512621",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-064",
    "sectorCode": "SEC-C",
    "businessCategory": "Abarrotes y Granos",
    "observations": null
  },
  {
    "num": 65,
    "internalCode": "MB-COM-00065",
    "firstName": "BEATRIZ",
    "lastName": "ORIHUELA DE LAPA",
    "dni": "20083528",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-065",
    "sectorCode": "SEC-C",
    "businessCategory": "Abarrotes y Granos",
    "observations": null
  },
  {
    "num": 66,
    "internalCode": "MB-COM-00066",
    "firstName": "BERTHA LAISA",
    "lastName": "PEREZ VDA. DE QUISPE",
    "dni": "19902222",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-066",
    "sectorCode": "SEC-C",
    "businessCategory": "Abarrotes y Granos",
    "observations": null
  },
  {
    "num": 67,
    "internalCode": "MB-COM-00067",
    "firstName": "SILVIO",
    "lastName": "POCOMUCHA HUAROC",
    "dni": "21246684",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-067",
    "sectorCode": "SEC-C",
    "businessCategory": "Abarrotes y Granos",
    "observations": null
  },
  {
    "num": 68,
    "internalCode": "MB-COM-00068",
    "firstName": "OLINDA YOLANDA DONATA",
    "lastName": "QUINTANA PEÑA",
    "dni": "19914822",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-068",
    "sectorCode": "SEC-C",
    "businessCategory": "Abarrotes y Granos",
    "observations": null
  },
  {
    "num": 69,
    "internalCode": "MB-COM-00069",
    "firstName": "ZENAIDA",
    "lastName": "QUISPE RETIZ",
    "dni": "20415566",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-069",
    "sectorCode": "SEC-C",
    "businessCategory": "Abarrotes y Granos",
    "observations": null
  },
  {
    "num": 70,
    "internalCode": "MB-COM-00070",
    "firstName": "TEOFILA JUSTA",
    "lastName": "RAFAEL PECHO",
    "dni": "19997172",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-070",
    "sectorCode": "SEC-C",
    "businessCategory": "Abarrotes y Granos",
    "observations": null
  },
  {
    "num": 71,
    "internalCode": "MB-COM-00071",
    "firstName": "ELSA FEMICIA",
    "lastName": "RAMÍREZ LÓPEZ",
    "dni": "20665423",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-071",
    "sectorCode": "SEC-C",
    "businessCategory": "Abarrotes y Granos",
    "observations": null
  },
  {
    "num": 72,
    "internalCode": "MB-COM-00072",
    "firstName": "JOSEFINA ALEJANDRA",
    "lastName": "RAMIREZ RIVERA",
    "dni": "19968871",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-072",
    "sectorCode": "SEC-C",
    "businessCategory": "Abarrotes y Granos",
    "observations": null
  },
  {
    "num": 73,
    "internalCode": "MB-COM-00073",
    "firstName": "JENY",
    "lastName": "RAMOS CANGAHUALA",
    "dni": "40707284",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-073",
    "sectorCode": "SEC-C",
    "businessCategory": "Abarrotes y Granos",
    "observations": null
  },
  {
    "num": 74,
    "internalCode": "MB-COM-00074",
    "firstName": "AGRIPINA",
    "lastName": "RAMOS CONDORI",
    "dni": "23266009",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-074",
    "sectorCode": "SEC-C",
    "businessCategory": "Abarrotes y Granos",
    "observations": null
  },
  {
    "num": 75,
    "internalCode": "MB-COM-00075",
    "firstName": "ALEJANDRO",
    "lastName": "REQUIZ ROBLES",
    "dni": "20082972",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-075",
    "sectorCode": "SEC-C",
    "businessCategory": "Abarrotes y Granos",
    "observations": null
  },
  {
    "num": 76,
    "internalCode": "MB-COM-00076",
    "firstName": "YIYE",
    "lastName": "REQUIZ SOTO",
    "dni": "40802806",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-076",
    "sectorCode": "SEC-C",
    "businessCategory": "Abarrotes y Granos",
    "observations": null
  },
  {
    "num": 77,
    "internalCode": "MB-COM-00077",
    "firstName": "ANA MARIA",
    "lastName": "RIOS MERCADO",
    "dni": "46184653",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-077",
    "sectorCode": "SEC-C",
    "businessCategory": "Abarrotes y Granos",
    "observations": null
  },
  {
    "num": 78,
    "internalCode": "MB-COM-00078",
    "firstName": "ELISABETH PRIMITIVA",
    "lastName": "RODRÍGUEZ GARCÍA",
    "dni": "20677849",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-078",
    "sectorCode": "SEC-C",
    "businessCategory": "Abarrotes y Granos",
    "observations": null
  },
  {
    "num": 79,
    "internalCode": "MB-COM-00079",
    "firstName": "GENOVEVA",
    "lastName": "ROJAS DE ALVARES",
    "dni": "20090025",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-079",
    "sectorCode": "SEC-C",
    "businessCategory": "Abarrotes y Granos",
    "observations": null
  },
  {
    "num": 80,
    "internalCode": "MB-COM-00080",
    "firstName": "SANTA MARIA",
    "lastName": "ROJAS HUANAY",
    "dni": "19889612",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-080",
    "sectorCode": "SEC-C",
    "businessCategory": "Abarrotes y Granos",
    "observations": null
  },
  {
    "num": 81,
    "internalCode": "MB-COM-00081",
    "firstName": "ROBERTO",
    "lastName": "ROJAS ROSALES",
    "dni": "20090081",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-081",
    "sectorCode": "SEC-C",
    "businessCategory": "Abarrotes y Granos",
    "observations": "DNI duplicado en documento fuente original (20090025) - verificar con padrón físico"
  },
  {
    "num": 82,
    "internalCode": "MB-COM-00082",
    "firstName": "SHULMA SONIA",
    "lastName": "ROMERO GARCIA",
    "dni": "40931518",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-082",
    "sectorCode": "SEC-D",
    "businessCategory": "Comidas y Juguería",
    "observations": null
  },
  {
    "num": 83,
    "internalCode": "MB-COM-00083",
    "firstName": "PATRICIA MARINA",
    "lastName": "ROSALES SOTO",
    "dni": "40770120",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-083",
    "sectorCode": "SEC-D",
    "businessCategory": "Comidas y Juguería",
    "observations": null
  },
  {
    "num": 84,
    "internalCode": "MB-COM-00084",
    "firstName": "BERTHA ROSA",
    "lastName": "SANCHEZ VDA. DE PEREZ",
    "dni": "19850561",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-084",
    "sectorCode": "SEC-D",
    "businessCategory": "Comidas y Juguería",
    "observations": null
  },
  {
    "num": 85,
    "internalCode": "MB-COM-00085",
    "firstName": "HONORATA",
    "lastName": "SARAVIA DE CONDORÍ",
    "dni": "19992411",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-085",
    "sectorCode": "SEC-D",
    "businessCategory": "Comidas y Juguería",
    "observations": null
  },
  {
    "num": 86,
    "internalCode": "MB-COM-00086",
    "firstName": "ELENA JUANA",
    "lastName": "SHUARTS MEZA",
    "dni": "20083412",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-086",
    "sectorCode": "SEC-D",
    "businessCategory": "Comidas y Juguería",
    "observations": null
  },
  {
    "num": 87,
    "internalCode": "MB-COM-00087",
    "firstName": "MÓNICA AMANDA",
    "lastName": "SOLÍS SOLÍS",
    "dni": "20089814",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-087",
    "sectorCode": "SEC-D",
    "businessCategory": "Comidas y Juguería",
    "observations": null
  },
  {
    "num": 88,
    "internalCode": "MB-COM-00088",
    "firstName": "NATALY JANINA",
    "lastName": "SOLIS ZARATE",
    "dni": "42780916",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-088",
    "sectorCode": "SEC-D",
    "businessCategory": "Comidas y Juguería",
    "observations": null
  },
  {
    "num": 89,
    "internalCode": "MB-COM-00089",
    "firstName": "JUANA",
    "lastName": "SOTO DE SIERRALTA",
    "dni": "19917740",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-089",
    "sectorCode": "SEC-D",
    "businessCategory": "Comidas y Juguería",
    "observations": null
  },
  {
    "num": 90,
    "internalCode": "MB-COM-00090",
    "firstName": "LUZ MATILDE",
    "lastName": "TICLLACURI HUAMANÍ",
    "dni": "21269375",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-090",
    "sectorCode": "SEC-D",
    "businessCategory": "Comidas y Juguería",
    "observations": null
  },
  {
    "num": 91,
    "internalCode": "MB-COM-00091",
    "firstName": "PILAR TEOFILA",
    "lastName": "TRINIDAD ALAVARADO",
    "dni": "04071342",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-091",
    "sectorCode": "SEC-D",
    "businessCategory": "Comidas y Juguería",
    "observations": null
  },
  {
    "num": 92,
    "internalCode": "MB-COM-00092",
    "firstName": "HERLINDA",
    "lastName": "URBANO MARTÍNEZ",
    "dni": "20024426",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-092",
    "sectorCode": "SEC-D",
    "businessCategory": "Comidas y Juguería",
    "observations": null
  },
  {
    "num": 93,
    "internalCode": "MB-COM-00093",
    "firstName": "ALVARO",
    "lastName": "URBANO VILCHEZ",
    "dni": "70231168",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-093",
    "sectorCode": "SEC-D",
    "businessCategory": "Comidas y Juguería",
    "observations": null
  },
  {
    "num": 94,
    "internalCode": "MB-COM-00094",
    "firstName": "YOLANDA JUANA",
    "lastName": "VARGAS LAURENTE",
    "dni": "20100904",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-094",
    "sectorCode": "SEC-D",
    "businessCategory": "Comidas y Juguería",
    "observations": null
  },
  {
    "num": 95,
    "internalCode": "MB-COM-00095",
    "firstName": "HERMELINDA",
    "lastName": "VILCHEZ AGUILAR",
    "dni": "19851711",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-095",
    "sectorCode": "SEC-D",
    "businessCategory": "Comidas y Juguería",
    "observations": null
  },
  {
    "num": 96,
    "internalCode": "MB-COM-00096",
    "firstName": "ROSARIO LÚZ",
    "lastName": "VILCHEZ PÉREZ",
    "dni": "20026869",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-096",
    "sectorCode": "SEC-D",
    "businessCategory": "Comidas y Juguería",
    "observations": null
  },
  {
    "num": 97,
    "internalCode": "MB-COM-00097",
    "firstName": "AMELIA CELESTINA",
    "lastName": "VILLANUEVA FERNANDEZ",
    "dni": "41012742",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-097",
    "sectorCode": "SEC-D",
    "businessCategory": "Comidas y Juguería",
    "observations": null
  },
  {
    "num": 98,
    "internalCode": "MB-COM-00098",
    "firstName": "EDITH",
    "lastName": "VILLANUEVA VASQUEZ",
    "dni": "44732250",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-098",
    "sectorCode": "SEC-D",
    "businessCategory": "Comidas y Juguería",
    "observations": null
  },
  {
    "num": 99,
    "internalCode": "MB-COM-00099",
    "firstName": "TOBÍAS DONATO",
    "lastName": "YARINGAÑO ESPINOZA",
    "dni": "20652545",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-099",
    "sectorCode": "SEC-D",
    "businessCategory": "Comidas y Juguería",
    "observations": null
  },
  {
    "num": 100,
    "internalCode": "MB-COM-00100",
    "firstName": "MARCOS",
    "lastName": "YUPANQUI ROMERO",
    "dni": "20082323",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-100",
    "sectorCode": "SEC-D",
    "businessCategory": "Comidas y Juguería",
    "observations": null
  },
  {
    "num": 101,
    "internalCode": "MB-COM-00101",
    "firstName": "FERNANDO FREDY",
    "lastName": "ZUASNABAR CUNYAS",
    "dni": "41190570",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-101",
    "sectorCode": "SEC-D",
    "businessCategory": "Comidas y Juguería",
    "observations": null
  },
  {
    "num": 102,
    "internalCode": "MB-COM-00102",
    "firstName": "ANA MARIA",
    "lastName": "ZURITA AMARO",
    "dni": "20099171",
    "cond": "SOCIO_REGULAR",
    "stallCode": "P-102",
    "sectorCode": "SEC-D",
    "businessCategory": "Comidas y Juguería",
    "observations": null
  },
  {
    "num": 103,
    "internalCode": "MB-COM-00103",
    "firstName": "ALEX",
    "lastName": "ANTONIO GARCIA",
    "dni": "44426811",
    "cond": "SOCIO_EN_PRUEBA",
    "stallCode": "P-103",
    "sectorCode": "SEC-D",
    "businessCategory": "Comidas y Juguería",
    "observations": null
  },
  {
    "num": 104,
    "internalCode": "MB-COM-00104",
    "firstName": "ANGHYELA LIZ",
    "lastName": "MEJIA IBARRA",
    "dni": "47657141",
    "cond": "SOCIO_EN_PRUEBA",
    "stallCode": "P-104",
    "sectorCode": "SEC-D",
    "businessCategory": "Comidas y Juguería",
    "observations": null
  },
  {
    "num": 105,
    "internalCode": "MB-COM-00105",
    "firstName": "NILDA",
    "lastName": "PIÑAS ORELLANA",
    "dni": "45736330",
    "cond": "SOCIO_EN_PRUEBA",
    "stallCode": "P-105",
    "sectorCode": "SEC-D",
    "businessCategory": "Comidas y Juguería",
    "observations": null
  },
  {
    "num": 106,
    "internalCode": "MB-COM-00106",
    "firstName": "LILI REBECA",
    "lastName": "PORTA CASTILLON",
    "dni": "20037108",
    "cond": "SOCIO_EN_PRUEBA",
    "stallCode": "P-106",
    "sectorCode": "SEC-D",
    "businessCategory": "Comidas y Juguería",
    "observations": null
  },
  {
    "num": 107,
    "internalCode": "MB-COM-00107",
    "firstName": "SONIA MARISOL",
    "lastName": "RIVERA MARQUEZ DE PANEZ",
    "dni": "20051234",
    "cond": "SOCIO_EN_PRUEBA",
    "stallCode": "P-107",
    "sectorCode": "SEC-D",
    "businessCategory": "Comidas y Juguería",
    "observations": null
  }
];

async function main() {
  console.log('====================================================');
  console.log('--- SEEDING OFICIAL: MERCADO DE ABASTOS MICAELA BASTIDAS ---');
  console.log('====================================================');

  // 0. LIMPIEZA PREVIA COMPLETA DE LA BASE DE DATOS
  console.log('--> Limpiando base de datos previa...');
  try {
    await prisma.stallRentalInstallment.deleteMany().catch(() => {});
    await prisma.stallRentalContract.deleteMany().catch(() => {});
    await prisma.marketExpense.deleteMany().catch(() => {});
    await prisma.advertisingScript.deleteMany().catch(() => {});
    await prisma.faenaAttendance.deleteMany().catch(() => {});
    await prisma.faena.deleteMany().catch(() => {});
    await prisma.attendanceEvent.deleteMany().catch(() => {});
    await prisma.meeting.deleteMany().catch(() => {});
    await prisma.advertisement.deleteMany().catch(() => {});
    await prisma.marketDocument.deleteMany().catch(() => {});
    await prisma.loanCollection.deleteMany().catch(() => {});
    await prisma.loan.deleteMany().catch(() => {});
    await prisma.ticket.deleteMany().catch(() => {});
    await prisma.sanitaryEntryTicket.deleteMany().catch(() => {});
    await prisma.sanitaryServiceSession.deleteMany().catch(() => {});
    await prisma.staffPayment.deleteMany().catch(() => {});
    await prisma.staffMember.deleteMany().catch(() => {});
    await prisma.camera.deleteMany().catch(() => {});
    await prisma.auditLog.deleteMany().catch(() => {});
    await prisma.cashMovement.deleteMany().catch(() => {});
    await prisma.payment.deleteMany().catch(() => {});
    await prisma.paymentObligation.deleteMany().catch(() => {});
    await prisma.merchant.updateMany({ data: { stallId: null } }).catch(() => {});
    await prisma.merchant.deleteMany().catch(() => {});
    await prisma.marketStall.deleteMany().catch(() => {});
    await prisma.sector.deleteMany().catch(() => {});
    await prisma.rate.deleteMany().catch(() => {});
    await prisma.paymentConcept.deleteMany().catch(() => {});
    await prisma.userRole.deleteMany().catch(() => {});
    await prisma.role.deleteMany().catch(() => {});
    await prisma.syncOperation.deleteMany().catch(() => {});
    await prisma.syncBatch.deleteMany().catch(() => {});
    await prisma.device.deleteMany().catch(() => {});
    await prisma.cashRegister.deleteMany().catch(() => {});
    await prisma.user.deleteMany().catch(() => {});
    await prisma.businessCategory.deleteMany().catch(() => {});
    await prisma.merchantType.deleteMany().catch(() => {});
    console.log('✓ Base de datos vaciada con éxito (estado limpio)');
  } catch (err: any) {
    console.warn('Advertencia durante limpieza previa:', err.message);
  }

  // 1. Roles del Sistema
  const roles = [
    { name: RoleType.ADMINISTRADOR, description: 'Acceso total al sistema, padrón y configuraciones' },
    { name: RoleType.TESORERA, description: 'Gestión de padrón, cobros, caja y rendiciones' },
    { name: RoleType.SERVICIOS_HIGIENICOS, description: 'Operación de turnos de servicios y control de tickets' },
    { name: RoleType.CONSULTA, description: 'Visualización de reportes e informes sin permisos de edición' },
  ];

  const createdRoles: Record<string, any> = {};
  for (const r of roles) {
    createdRoles[r.name] = await prisma.role.upsert({
      where: { name: r.name },
      update: {},
      create: r,
    });
  }
  console.log('✓ Roles creados');

  // 2. Usuarios del Sistema con Credenciales Seguras
  const passwordHash = await bcrypt.hash('Micaela2026!', 10);
  const users = [
    {
      username: 'admin',
      email: 'admin@micaelabastidas.pe',
      fullName: 'Carlos Morales Mendoza',
      phone: '987654321',
      role: RoleType.ADMINISTRADOR,
    },
    {
      username: 'tesorera',
      email: 'tesoreria@micaelabastidas.pe',
      fullName: 'María Elena Quispe Rojas',
      phone: '984123456',
      role: RoleType.TESORERA,
    },
    {
      username: 'sshh_operador',
      email: 'sshh@micaelabastidas.pe',
      fullName: 'Jorge Huamán Ramos',
      phone: '976543210',
      role: RoleType.SERVICIOS_HIGIENICOS,
    },
    {
      username: 'consulta',
      email: 'auditoria@micaelabastidas.pe',
      fullName: 'Lucía Fernández Castro',
      phone: '951234567',
      role: RoleType.CONSULTA,
    },
  ];

  const createdUsers: Record<string, any> = {};
  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { username: u.username },
      update: { passwordHash },
      create: {
        username: u.username,
        email: u.email,
        fullName: u.fullName,
        phone: u.phone,
        passwordHash,
      },
    });
    createdUsers[u.username] = user;

    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: user.id,
          roleId: createdRoles[u.role].id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        roleId: createdRoles[u.role].id,
      },
    });
  }
  console.log('✓ Usuarios de gestión creados (admin, tesorera, sshh_operador, consulta)');

  // 3. Tipos de Comerciantes Oficiales
  const merchantTypes = [
    { code: MerchantTypeEnum.SOCIO, name: 'Socio Titular', description: 'Comerciante socio del mercado con derecho estatutario y puesto asignado' },
    { code: MerchantTypeEnum.INQUILINO, name: 'Inquilino', description: 'Arrendatario de puesto comercial o módulo del mercado' },
    { code: MerchantTypeEnum.AMBULANTE_FIJO, name: 'Ambulante Fijo', description: 'Comerciante con espacio regular asignado en pasajes autorizados' },
    { code: MerchantTypeEnum.AMBULANTE_TEMPORAL, name: 'Ambulante Temporal', description: 'Comerciante rotativo o de días de feria' },
  ];
  const createdTypes: Record<string, any> = {};
  for (const mt of merchantTypes) {
    createdTypes[mt.code] = await prisma.merchantType.upsert({
      where: { code: mt.code },
      update: {},
      create: mt,
    });
  }
  console.log('✓ Tipos de comerciantes configurados (Socio, Inquilino, Ambulante Fijo, Temporal)');

  // 4. Giros y Rubros Comerciales
  const categoriesList = [
    'Carnes y Aves',
    'Frutas y Verduras',
    'Abarrotes y Granos',
    'Comidas y Juguería',
    'Flores y Plantas',
    'Bolsas y Plásticos',
    'Hierbas y Especias',
    'Ropa y Calzado',
    'Comercio General',
  ];
  for (const catName of categoriesList) {
    await prisma.businessCategory.upsert({
      where: { name: catName },
      update: {},
      create: { name: catName },
    });
  }
  console.log('✓ Categorías de giros comerciales creadas');

  // 5. Sectores del Mercado
  const sectors = [
    { code: 'SEC-A', name: 'Sector Carnes y Pescados', description: 'Pabellón A: Venta de carnes rojas, aves y pescados' },
    { code: 'SEC-B', name: 'Sector Frutas y Verduras', description: 'Pabellón B: Frutas frescas, hortalizas y tubérculos' },
    { code: 'SEC-C', name: 'Sector Abarrotes y Granos', description: 'Pabellón C: Víveres, lácteos y productos secos' },
    { code: 'SEC-D', name: 'Sector Comidas y Jugos', description: 'Pabellón D: Puestos de comida preparada y juguerías' },
    { code: 'SEC-AMB', name: 'Zona Ambulatoria Externa', description: 'Pasajes perimétricos y explanada exterior' },
  ];
  const createdSectors: Record<string, any> = {};
  for (const s of sectors) {
    createdSectors[s.code] = await prisma.sector.upsert({
      where: { code: s.code },
      update: {},
      create: s,
    });
  }
  console.log('✓ Sectores del mercado configurados');

  // 6. Puestos de Mercado (P-001 a P-120)
  const createdStalls: Record<string, any> = {};
  for (let i = 1; i <= 120; i++) {
    const stallCode = 'P-' + String(i).padStart(3, '0');
    let sectorCode = 'SEC-A';
    let desc = 'Pabellón A - Carnes y Aves';
    let stallNumber = i;
    if (i > 27 && i <= 54) {
      sectorCode = 'SEC-B';
      desc = 'Pabellón B - Frutas y Verduras';
      stallNumber = i - 27;
    } else if (i > 54 && i <= 81) {
      sectorCode = 'SEC-C';
      desc = 'Pabellón C - Abarrotes y Granos';
      stallNumber = i - 54;
    } else if (i > 81 && i <= 107) {
      sectorCode = 'SEC-D';
      desc = 'Pabellón D - Comidas y Jugos';
      stallNumber = i - 81;
    } else if (i > 107) {
      sectorCode = 'SEC-AMB';
      desc = 'Módulo Disponible para Nuevos Comerciantes / Inquilinos';
      stallNumber = i - 107;
    }

    createdStalls[stallCode] = await prisma.marketStall.upsert({
      where: { code: stallCode },
      update: {
        giro: createdSectors[sectorCode].name,
        stallNumber,
      },
      create: {
        code: stallCode,
        sectorId: createdSectors[sectorCode].id,
        giro: createdSectors[sectorCode].name,
        stallNumber,
        locationDescription: desc,
        status: i <= 107 ? StallStatus.OCUPADO : StallStatus.LIBRE,
      },
    });
  }
  console.log('✓ 120 puestos creados (P-001 al P-120)');

  // 7. Conceptos de Cobranza Oficiales
  const concepts = [
    { code: 'ALCABALA', name: 'Alcabala / Derecho de Puesto', periodicity: Periodicity.MENSUAL, description: 'Cuota de mantenimiento y ocupación del puesto' },
    { code: 'AGUA', name: 'Servicio de Agua Potable', periodicity: Periodicity.MENSUAL, description: 'Consumo y mantenimiento de redes sanitarias' },
    { code: 'ALQUILER_INQUILINO', name: 'Alquiler de Puesto (Inquilinos)', periodicity: Periodicity.MENSUAL, description: 'Canon de arrendamiento para inquilinos del mercado' },
    { code: 'AGUA_INQUILINO', name: 'Agua Potable Inquilinos', periodicity: Periodicity.MENSUAL, description: 'Consumo de agua para puestos de inquilinos' },
    { code: 'TICKET_AMBULANTE_1', name: 'Ticket Ambulante S/ 1.00', periodicity: Periodicity.DIARIO, description: 'Tarifa básica para ambulantes de paso con canasta' },
    { code: 'TICKET_AMBULANTE_2', name: 'Ticket Ambulante S/ 2.00', periodicity: Periodicity.DIARIO, description: 'Tarifa intermedia para ambulantes con carretilla' },
    { code: 'TICKET_AMBULANTE_3', name: 'Ticket Ambulante S/ 3.00', periodicity: Periodicity.DIARIO, description: 'Tarifa completa para ambulantes con puesto temporal' },
    { code: 'MICCIONARIO', name: 'Uso de Miccionario', periodicity: Periodicity.POR_USO, description: 'Uso de urinario en servicios higiénicos' },
    { code: 'RETRETE', name: 'Uso de Retrete', periodicity: Periodicity.POR_USO, description: 'Uso de inodoro/retrete en servicios higiénicos' },
    { code: 'MULTA_FAENA', name: 'Multa por Inasistencia a Faena', periodicity: Periodicity.POR_USO, description: 'Sanción económica por no participar en la faena de limpieza' },
    { code: 'MULTA_ASAMBLEA', name: 'Multa por Inasistencia a Asamblea', periodicity: Periodicity.POR_USO, description: 'Sanción económica por inasistencia no justificada a asamblea general' },
    { code: 'PUBLICIDAD_PERIFONEO', name: 'Publicidad por Perifoneo', periodicity: Periodicity.DIARIO, description: 'Emisión de spots de audio en altavoces del mercado' },
    { code: 'PUBLICIDAD_BANNER', name: 'Publicidad Banners y Carteles', periodicity: Periodicity.MENSUAL, description: 'Exhibición publicitaria en pasajes y muros del mercado' },
    { code: 'FONDO_ROTATORIO_COBRANZA', name: 'Recuperación Fondo Rotatorio', periodicity: Periodicity.POR_USO, description: 'Cobranza y amortización de préstamos a comerciantes' },
  ];
  const createdConcepts: Record<string, any> = {};
  for (const c of concepts) {
    createdConcepts[c.code] = await prisma.paymentConcept.upsert({
      where: { code: c.code },
      update: {},
      create: c,
    });
  }

  // 8. Tarifas Vigentes
  const ratesData = [
    { concept: 'ALCABALA', type: MerchantTypeEnum.SOCIO, amount: 10.00 },
    { concept: 'ALCABALA', type: MerchantTypeEnum.AMBULANTE_FIJO, amount: 3.00 },
    { concept: 'ALCABALA', type: MerchantTypeEnum.AMBULANTE_TEMPORAL, amount: 4.00 },
    { concept: 'AGUA', type: MerchantTypeEnum.SOCIO, amount: 6.00 },
    { concept: 'AGUA', type: MerchantTypeEnum.AMBULANTE_FIJO, amount: 3.00 },
    { concept: 'ALQUILER_INQUILINO', type: MerchantTypeEnum.INQUILINO, amount: 150.00 },
    { concept: 'AGUA_INQUILINO', type: MerchantTypeEnum.INQUILINO, amount: 10.00 },
    { concept: 'MICCIONARIO', type: null, amount: 0.50 },
    { concept: 'RETRETE', type: null, amount: 1.00 },
    { concept: 'MULTA_ASAMBLEA', type: MerchantTypeEnum.SOCIO, amount: 50.00 },
    { concept: 'MULTA_FAENA', type: MerchantTypeEnum.SOCIO, amount: 30.00 },
  ];
  for (const r of ratesData) {
    const conceptId = createdConcepts[r.concept].id;
    const typeId = r.type ? createdTypes[r.type].id : null;
    const existing = await prisma.rate.findFirst({
      where: {
        conceptId,
        merchantTypeId: typeId,
        isActive: true,
      },
    });
    if (!existing) {
      await prisma.rate.create({
        data: {
          conceptId,
          merchantTypeId: typeId,
          amount: r.amount,
          currency: 'PEN',
          startDate: new Date('2026-01-01'),
          isActive: true,
        },
      });
    }
  }
  console.log('✓ Conceptos de cobro y tarifas configuradas');

  // 8.1 Categorías Oficiales de Gestión Documental
  const docCategories = [
    { code: 'CARTA_RECIBIDA', name: 'Cartas Recibidas', direction: 'RECIBIDO', description: 'Comunicaciones y cartas ingresadas por socios, vecinos o entidades' },
    { code: 'CARTA_ENVIADA', name: 'Cartas Enviadas', direction: 'ENVIADO', description: 'Cartas oficiales emitidas por la Junta Directiva' },
    { code: 'SOLICITUD', name: 'Solicitudes', direction: 'RECIBIDO', description: 'Peticiones formales de socios, comerciantes o terceros' },
    { code: 'OFICIO', name: 'Oficios y Comunicaciones', direction: 'ENVIADO', description: 'Oficios dirigidos a la Municipalidad, Policía, Bomberos, etc.' },
    { code: 'MEMORANDUM', name: 'Memorándum', direction: 'INTERNO', description: 'Comunicaciones internas de cumplimiento obligatorio' },
    { code: 'CONTRATO', name: 'Contratos y Convenios', direction: 'INTERNO', description: 'Contratos de alquiler de puestos, servicios y acuerdos' },
    { code: 'CONSTANCIA', name: 'Constancias y Certificados', direction: 'ENVIADO', description: 'Constancias de socio, no adeudo, trabajo y posesión' },
    { code: 'RESOLUCION', name: 'Resoluciones Directivas', direction: 'INTERNO', description: 'Acuerdos formales tomados en sesiones de Consejo Directivo' },
    { code: 'INFORME', name: 'Informes de Gestión y Balances', direction: 'INTERNO', description: 'Informes contables, financieros y comisiones' },
    { code: 'OTROS', name: 'Otros Documentos Oficiales', direction: 'INTERNO', description: 'Archivos generales del archivo institucional' },
  ];
  for (const dc of docCategories) {
    await prisma.documentCategory.upsert({
      where: { code: dc.code },
      update: {},
      create: dc,
    });
  }
  console.log('✓ Categorías de Gestión Documental configuradas');

  // 8.2 Conceptos de Gestión Documental
  const docConcepts = [
    { code: 'ASAMBLEA', name: 'Asambleas Generales', description: 'Convocatorias, padrones y actas de asambleas ordinarias y extraordinarias' },
    { code: 'FAENA', name: 'Faenas de Limpieza', description: 'Campañas comunales de limpieza, fumigación y desinfección' },
    { code: 'LEGAL', name: 'Asuntos Legales y Notariales', description: 'Trámites en Registros Públicos (SUNARP), notarías y juzgados' },
    { code: 'MUNICIPAL', name: 'Gestión Municipal', description: 'Licencias de funcionamiento, defensa civil (ITSE) y arbitrios' },
    { code: 'SUNAT', name: 'Tributación SUNAT', description: 'Declaraciones, RUC, libros contables y tributos' },
    { code: 'SERVICIOS_PUBLICOS', name: 'Servicios Básicos (Agua y Luz)', description: 'Gestiones ante Sedam Huancayo y Electrocentro' },
    { code: 'INFRAESTRUCTURA', name: 'Obras y Mantenimiento', description: 'Proyectos de techado, pisos, electrificación y seguridad' },
    { code: 'PADRON_SOCIOS', name: 'Padrón y Membresía', description: 'Expedientes de admisión, transferencias y bajas de socios' },
  ];
  for (const c of docConcepts) {
    await prisma.documentConcept.upsert({
      where: { code: c.code },
      update: {},
      create: c,
    });
  }
  console.log('✓ Conceptos de Gestión Documental configurados');

  // 8.3 Guiones Publicitarios Pre-escritos
  const defaultScripts = [
    {
      title: 'Citación a Asamblea General Ordinaria',
      category: 'ASAMBLEA',
      estimatedDurationSeconds: 35,
      content: '¡Atención comerciantes y socios del Mercado Micaela Bastidas! Por encargo de la Junta Directiva, se cita a todos los socios a la próxima ASAMBLEA GENERAL ORDINARIA a realizarse el día [FECHA] a horas [HORA] en el patio central del mercado. Agenda: Balance económico y proyectos de techado. Se recuerda que la asistencia es obligatoria y se aplicará la multa de ley a los inasistentes. ¡Puntualidad es respeto!',
    },
    {
      title: 'Convocatoria a Faena Comunal de Limpieza',
      category: 'FAENA',
      estimatedDurationSeconds: 30,
      content: '¡Aviso importante de salubridad! Se comunica a todos los comerciantes de los sectores Carnes, Frutas, Abarrotes y Comidas que este [DÍA] desde las [HORA] realizaremos la GRAN FAENA DE LIMPIEZA Y DESINFECCIÓN GENERAL de nuestros pasajes. Traer escobillones, detergente y baldes de agua. Evitemos multas y mantengamos limpio nuestro mercado.',
    },
    {
      title: 'Comunicado de Pago de Cuotas Mensuales',
      category: 'AVISO_COBRANZA',
      estimatedDurationSeconds: 25,
      content: 'Estimados socios e inquilinos, la Tesorería del mercado les recuerda que ya se encuentran al cobro las cuotas del mes correspondiente a Alcabala de puesto y Servicio de Agua. Acérquense a la oficina de administración de 8:00 AM a 2:00 PM para evitar recargos o corte de servicios.',
    },
    {
      title: 'Promoción Comercial de Puesto de Comidas y Jugos',
      category: 'PROMOCION_SOCIO',
      estimatedDurationSeconds: 25,
      content: '¡Para todos nuestros caseros y caseras! Visiten el pabellón de Comidas del Mercado Micaela Bastidas. Hoy exquisitos menús criollos, caldos de gallina y jugos naturales preparados al instante con total higiene y al mejor precio de la ciudad. ¡Los esperamos!',
    },
    {
      title: 'Aviso de Seguridad y Cuidado de Pertenencias',
      category: 'COMUNICADO_GENERAL',
      estimatedDurationSeconds: 25,
      content: 'A todo el público consumidor y comerciantes: Por su seguridad, mantengan a la vista sus bolsos, billeteras y celulares en las zonas de mayor tránsito. Nuestro mercado cuenta con sistema de videovigilancia CCTV en todos los pabellones. ¡Juntos cuidamos nuestro mercado!',
    },
  ];
  for (const s of defaultScripts) {
    const existingScript = await prisma.advertisingScript.findFirst({ where: { title: s.title } });
    if (!existingScript) {
      await prisma.advertisingScript.create({ data: s });
    }
  }
  console.log('✓ Guiones publicitarios pre-escritos configurados');

  // 9. CARGA DE LOS 107 SOCIOS OFICIALES DEL MERCADO MICAELA BASTIDAS
  console.log('--> Insertando 107 socios oficiales ordenados alfabéticamente...');
  const createdMerchants: Record<string, any> = {};

  for (const m of officialSociosData) {
    const stall = createdStalls[m.stallCode];

    // Desvincular cualquier comerciante previo que pudiera tener este puesto
    if (stall?.id) {
      await prisma.merchant.updateMany({
        where: { stallId: stall.id, NOT: { dni: m.dni } },
        data: { stallId: null },
      });
    }

    // Buscar si ya existe por DNI o por código interno
    const existing = await prisma.merchant.findFirst({
      where: {
        OR: [
          { dni: m.dni },
          { internalCode: m.internalCode },
        ],
      },
    });

    let merchant;
    if (existing) {
      merchant = await prisma.merchant.update({
        where: { id: existing.id },
        data: {
          internalCode: m.internalCode,
          qrCode: 'MB-QR-' + m.dni,
          firstName: m.firstName,
          lastName: m.lastName,
          dni: m.dni,
          merchantTypeId: createdTypes['SOCIO'].id,
          memberCondition: m.cond as MemberCondition,
          sectorId: createdSectors[m.sectorCode].id,
          stallId: stall?.id,
          businessCategory: m.businessCategory,
          status: MerchantStatus.ACTIVO,
          observations: m.observations,
        },
      });
    } else {
      merchant = await prisma.merchant.create({
        data: {
          internalCode: m.internalCode,
          qrCode: 'MB-QR-' + m.dni,
          firstName: m.firstName,
          lastName: m.lastName,
          dni: m.dni,
          merchantTypeId: createdTypes['SOCIO'].id,
          memberCondition: m.cond as MemberCondition,
          sectorId: createdSectors[m.sectorCode].id,
          stallId: stall?.id,
          businessCategory: m.businessCategory,
          status: MerchantStatus.ACTIVO,
          observations: m.observations,
        },
      });
    }

    createdMerchants[m.internalCode] = merchant;
  }
  console.log('✓ 107 socios oficiales registrados con credenciales QR y puestos asignados');

  // 9.1 CARGA DE LOS 8 INQUILINOS DEL MERCADO (Hoja C-ALQUILERES)
  const officialInquilinos = [
    { code: 'MB-INQ-00001', name: 'HUATARUNCO CHUQUILLANQUI BETZABE', dni: '40123001', rent: 170.00, stall: 'INQ-01', cat: 'Abarrotes y Varios' },
    { code: 'MB-INQ-00002', name: 'MACHA CASALLO EDWIN', dni: '40123002', rent: 170.00, stall: 'INQ-02', cat: 'Verduras y Frutas' },
    { code: 'MB-INQ-00003', name: 'GONZALO ASTO ROCIO', dni: '40123003', rent: 170.00, stall: 'INQ-03', cat: 'Comercio General' },
    { code: 'MB-INQ-00004', name: 'OSCANOA RAMOS GINA PILAR', dni: '40123004', rent: 200.00, stall: 'INQ-04', cat: 'Carnicería / Aves' },
    { code: 'MB-INQ-00005', name: 'SALVATIERRA HUAMANI EDGAR', dni: '40123005', rent: 400.00, stall: 'INQ-05', cat: 'Abarrotes Mayorista' },
    { code: 'MB-INQ-00006', name: 'QUISPE QUISPE JUAN', dni: '40123006', rent: 400.00, stall: 'INQ-06', cat: 'Distribuidora Comercial' },
    { code: 'MB-INQ-00007', name: 'MUÑOZ CARDENAS JAVIER', dni: '40123007', rent: 180.00, stall: 'INQ-07', cat: 'Comidas y Bebidas' },
    { code: 'MB-INQ-00008', name: 'MIRANDA SOTO VICTORIA', dni: '40123008', rent: 150.00, stall: 'INQ-08', cat: 'Bazar y Plásticos' },
  ];
  for (const inq of officialInquilinos) {
    const parts = inq.name.split(' ');
    const firstName = parts.slice(2).join(' ') || parts[1] || inq.name;
    const lastName = parts.slice(0, 2).join(' ') || parts[0];
    const existing = await prisma.merchant.findFirst({ where: { OR: [{ dni: inq.dni }, { internalCode: inq.code }] } });
    if (existing) {
      await prisma.merchant.update({
        where: { id: existing.id },
        data: {
          internalCode: inq.code,
          qrCode: 'MB-QR-' + inq.dni,
          firstName,
          lastName,
          dni: inq.dni,
          merchantTypeId: createdTypes['INQUILINO'].id,
          memberCondition: 'NO_APLICA' as any,
          sectorId: createdSectors['SEC-B'].id,
          businessCategory: inq.cat,
          status: MerchantStatus.ACTIVO,
        },
      });
    } else {
      await prisma.merchant.create({
        data: {
          internalCode: inq.code,
          qrCode: 'MB-QR-' + inq.dni,
          firstName,
          lastName,
          dni: inq.dni,
          merchantTypeId: createdTypes['INQUILINO'].id,
          memberCondition: 'NO_APLICA' as any,
          sectorId: createdSectors['SEC-B'].id,
          businessCategory: inq.cat,
          status: MerchantStatus.ACTIVO,
        },
      });
    }
  }
  console.log('✓ 8 Inquilinos oficiales registrados (MB-INQ-00001 al 00008)');

  // 9.2 CARGA DE LOS 34 AMBULANTES FIJOS (Hoja ALCABALA FIJO)
  const officialAmbulantesFijos = [
    { code: 'MB-AF-00001', name: 'JUAN HUAMAN', cat: 'COMIDA' },
    { code: 'MB-AF-00002', name: 'MARITZA CALIXTO', cat: 'COMIDA' },
    { code: 'MB-AF-00003', name: 'ALBINA CARBAJAL', cat: 'FRUTA' },
    { code: 'MB-AF-00004', name: 'MARTHA HUAMAN', cat: 'COMIDA' },
    { code: 'MB-AF-00005', name: 'MARGARITA QUISPE', cat: 'COMIDA' },
    { code: 'MB-AF-00006', name: 'ELSA PALOMINO', cat: 'COMIDA' },
    { code: 'MB-AF-00007', name: 'ALFONSO DE LA CRUZ', cat: 'COMIDA' },
    { code: 'MB-AF-00008', name: 'GLADYS VILLANUEVA', cat: 'COMIDA' },
    { code: 'MB-AF-00009', name: 'FREDY HUAMAN', cat: 'CARNE' },
    { code: 'MB-AF-00010', name: 'MARINA VILCAPOMA', cat: 'CARNE' },
    { code: 'MB-AF-00011', name: 'MARIA PAQUIYAURI', cat: 'VARIOS' },
    { code: 'MB-AF-00012', name: 'YOVANA ROJAS', cat: 'CARNE' },
    { code: 'MB-AF-00013', name: 'EUGENIA ROJAS', cat: 'CARNE' },
    { code: 'MB-AF-00014', name: 'LIDIA CHUPURGO', cat: 'CARNE' },
    { code: 'MB-AF-00015', name: 'DELIA TAIPE', cat: 'CARNE' },
    { code: 'MB-AF-00016', name: 'PABLO CORDOVA', cat: 'VERDURA' },
    { code: 'MB-AF-00017', name: 'EVA ROJAS', cat: 'VARIOS' },
    { code: 'MB-AF-00018', name: 'HILDA HUARI', cat: 'OTROS' },
    { code: 'MB-AF-00019', name: 'VICTORIA ASTO', cat: 'OTROS' },
    { code: 'MB-AF-00020', name: 'TEOFILA SUAZO', cat: 'PAPA' },
    { code: 'MB-AF-00021', name: 'ISABEL SEDANO', cat: 'PAPA' },
    { code: 'MB-AF-00022', name: 'LOURDES CASTILLON', cat: 'PAPA' },
    { code: 'MB-AF-00023', name: 'MILA HILARIO', cat: 'PAPA' },
    { code: 'MB-AF-00024', name: 'MAXIMO HILARIO', cat: 'PAPA' },
    { code: 'MB-AF-00025', name: 'ALEJANDRO PARI', cat: 'PAPA' },
    { code: 'MB-AF-00026', name: 'DONATA PARI', cat: 'PAPA' },
    { code: 'MB-AF-00027', name: 'JESUS PARI', cat: 'PAPA' },
    { code: 'MB-AF-00028', name: 'HAYDEE QUISPE', cat: 'PAPA' },
    { code: 'MB-AF-00029', name: 'SONIA ROJAS', cat: 'PAPA' },
    { code: 'MB-AF-00030', name: 'JULIA LAURA', cat: 'PAPA' },
    { code: 'MB-AF-00031', name: 'DINA MENDOZA', cat: 'PAPA' },
    { code: 'MB-AF-00032', name: 'LIDIA PARIONA', cat: 'PAPA' },
    { code: 'MB-AF-00033', name: 'ELVIRA ROJAS', cat: 'PAPA' },
    { code: 'MB-AF-00034', name: 'FORTUNATA ROJAS', cat: 'PAPA' },
  ];
  for (let i = 0; i < officialAmbulantesFijos.length; i++) {
    const af = officialAmbulantesFijos[i];
    const dummyDni = (50000000 + i + 1).toString();
    const parts = af.name.split(' ');
    const firstName = parts[0];
    const lastName = parts.slice(1).join(' ') || 'Ambulante';
    const existing = await prisma.merchant.findFirst({ where: { OR: [{ dni: dummyDni }, { internalCode: af.code }] } });
    if (existing) {
      await prisma.merchant.update({
        where: { id: existing.id },
        data: {
          internalCode: af.code,
          qrCode: 'MB-QR-' + dummyDni,
          firstName,
          lastName,
          dni: dummyDni,
          merchantTypeId: createdTypes['AMBULANTE_FIJO'].id,
          memberCondition: 'NO_APLICA' as any,
          sectorId: createdSectors['SEC-C'].id,
          businessCategory: af.cat,
          status: MerchantStatus.ACTIVO,
        },
      });
    } else {
      await prisma.merchant.create({
        data: {
          internalCode: af.code,
          qrCode: 'MB-QR-' + dummyDni,
          firstName,
          lastName,
          dni: dummyDni,
          merchantTypeId: createdTypes['AMBULANTE_FIJO'].id,
          memberCondition: 'NO_APLICA' as any,
          sectorId: createdSectors['SEC-C'].id,
          businessCategory: af.cat,
          status: MerchantStatus.ACTIVO,
        },
      });
    }
  }
  console.log('✓ 34 Ambulantes Fijos oficiales registrados (MB-AF-00001 al 00034)');

  // 10. Caja inicial de Tesorería (Abierta para hoy)
  const tesoreraUser = createdUsers['tesorera'];
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  await prisma.cashRegister.create({
    data: {
      name: `Caja Principal Tesorería - ${todayStr}`,
      openedById: tesoreraUser.id,
      openingAmount: 150.00,
      openedAt: new Date(today.setHours(7, 30, 0, 0)),
      status: CashRegisterStatus.ABIERTO,
    },
  });
  console.log('✓ Caja principal de tesorería aperturada con S/ 150.00');

  // 11. Generación de Cuotas Mensuales del Período Actual (2026-09)
  const currentPeriod = '2026-09';
  const dueDate = new Date('2026-09-30T23:59:59');

  console.log('--> Generando obligaciones mensuales (Alcabala y Agua) para los 107 socios...');
  for (const m of officialSociosData) {
    const merchant = createdMerchants[m.internalCode];
    // Alcabala S/ 10.00
    await prisma.paymentObligation.upsert({
      where: {
        merchantId_conceptId_period: {
          merchantId: merchant.id,
          conceptId: createdConcepts['ALCABALA'].id,
          period: currentPeriod,
        },
      },
      update: {},
      create: {
        merchantId: merchant.id,
        conceptId: createdConcepts['ALCABALA'].id,
        period: currentPeriod,
        year: 2026,
        month: 9,
        dueDate,
        amount: 10.00,
        status: ObligationStatus.PENDIENTE,
      },
    });

    // Agua S/ 6.00
    await prisma.paymentObligation.upsert({
      where: {
        merchantId_conceptId_period: {
          merchantId: merchant.id,
          conceptId: createdConcepts['AGUA'].id,
          period: currentPeriod,
        },
      },
      update: {},
      create: {
        merchantId: merchant.id,
        conceptId: createdConcepts['AGUA'].id,
        period: currentPeriod,
        year: 2026,
        month: 9,
        dueDate,
        amount: 6.00,
        status: ObligationStatus.PENDIENTE,
      },
    });
  }
  console.log('✓ Obligaciones de pago del mes actual generadas para los 107 socios');

  console.log('====================================================');
  console.log('✓ CARGA DE SEED COMPLETADA CON ÉXITO');
  console.log('✓ TOTAL SOCIOS ACTIVOS: 107');
  console.log('✓ SOCIOS TITULARES: 102');
  console.log('✓ SOCIOS EN PRUEBA: 5');
  console.log('====================================================');
}

main()
  .catch((e) => {
    console.error('Error fatal al ejecutar seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
