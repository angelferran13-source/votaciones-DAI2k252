// ===============
// PARTICIPANTES
// ===============
// Cambia nombres y fotos según tu evento. Asegúrate que los archivos existan en /img

const participants = [
  { id: "p1",  name: "Valentin",  photo: "img/p1.png" },
  { id: "p2",  name: "Milvia",  photo:  "img/imgp2.jpg" },
  { id: "p3",  name: "Naybisel",  photo: "img/imgp3.jpg" },
  { id: "p4",  name: "Anubis",  photo: "img/imgp4.jpg" },
  { id: "p5",  name: "Luisa",  photo: "img/imgp5.jpg" },
  { id: "p6",  name: "Gudiño",  photo: "img/imgp6.jpg" },
  { id: "p7",  name: "Manuel",  photo: "img/imgp7.jpg" },
  { id: "p8",  name: "Maria",  photo: "img/imgp8.jpg" },
  { id: "p9",  name: "Mauricio",  photo: "img/imgp9.jpg" },
  { id: "p10", name: "Wendolyn", photo: "img/imgp10.jpg" },
  { id: "p11", name: "Batista", photo: "img/imgp11.jpg" },
  { id: "p12", name: "Esmeralda", photo: "img/imgp12.jpg" },
  { id: "p13", name: "Juan", photo: "img/imgp13.jpg" },
  { id: "p14", name: "Romero", photo: "img/imgp14.jpg" },
  { id: "p15", name: "Gloribel", photo: "img/imgp15.jpg" },
  { id: "p16", name: "Reyes", photo: "img/imgp16.jpg" },
  { id: "p17", name: "Zenide", photo: "img/imgp17.jpg" },
  { id: "p18", name: "Eliecer", photo: "img/imgp18.jpg" },
  { id: "p19", name: "Zelideth", photo: "img/imgp19.jpg" },
  { id: "p20", name: "Yeimi ", photo: "img/imgp20.jpg" },
  { id: "p21", name: "Menchaca", photo: "img/imgp21.jpg" },
  { id: "p22", name: "De león", photo: "img/imgp22.jpg" },
  { id: "p23", name: "Karol", photo: "img/imgp23.jpg" },
  { id: "p24", name: "Emil", photo: "img/imgp24.jpg" },
  { id: "p25", name: "Rosa", photo: "img/imgp25.jpg" },
  { id: "p26", name: "Ana", photo: "img/imgp26.jpg" },
  { id: "p27", name: "Gisela", photo: "img/imgp27.jpg" },
  { id: "p28", name: "Pedro", photo: "img/imgp28.jpg" },
  { id: "p29", name: "Dorca", photo: "img/imgp29.jpg" },
  { id: "p30", name: "Jaisiel", photo: "img/imgp30.jpg" },
  { id: "p31", name: "Bresnev", photo: "img/imgp31.jpg" },
  { id: "p32", name: "Jean Jean", photo: "img/imgp32.jpg" },
  { id: "p33", name: "Miller", photo: "img/imgp33.jpg" },
  { id: "p34", name: "Denia", photo: "img/imgp34.jpg" },
  { id: "p35", name: "carlos", photo: "img/imgp35.jpg" },
  { id: "p36", name: "Muñoz", photo: "img/imgp36.jpg" },
  { id: "p37", name: "Miliet", photo: "img/imgp37.jpg" },
  { id: "p38", name: "albertino", photo: "img/imgp38.jpg" },
  { id: "p39", name: "Participante 39", photo: "img/imgp39.jpg" },
  { id: "p40", name: "Participante 40", photo: "img/imgp40.jpg" }
];

// Mapa rápido por id
const participantsById = {};
participants.forEach(p => (participantsById[p.id] = p));

// ==================
// CATEGORÍAS Y NOMINACIONES
// ==================

const categories = [
  {
    id: "cat1",
    name: "Divertidos y sociales",
    nominations: [
      {
        id: "cat1_nom1",
        name: "El mas alegre de la oficina",
        participants: ["p38", "p6", "p36", "p19"]
      },
      {
        id: "cat1_nom2",
        name: "el alma de la fiesta",
        participants: ["p32", "p6", "13", "p19"]
      }
    ]
  },
  {
    id: "cat2",
    name: "trabajo y desempeño",
    nominations: [
      {
        id: "cat2_nom1",
        name: "el mejor lider",
        participants: ["p14", "p8", "23", "p18"]
      },
      {
        id: "cat2_nom2",
        name: "el mas colaborador",
        participants: ["p33", "p15", "17", "p32"]
      },
       {
        id: "cat2_nom3",
        name: "El solucionador de problemas",
        participants: ["p36", "p15", "p33", "p18"]
      }
    ]

    
  },
  {
    id: "cat3",
    name: "Compañerismo",
    nominations: [
      {
        id: "cat3_nom1",
        name: "El mas servicial",
        participants: ["p9", "p17", "p10", "p38"]
      },
      {
        id: "cat3_nom2",
        name: "El que nunca pierde la calma",
        participants: ["p18", "p11", "p8", "p21"]
      }
    ]
  },
  {
    id: "cat4",
    name: "Temáticas Navideñas",
    nominations: [
      {
        id: "cat4_nom1",
        name: "El mas entusiasta con la decoración",
        participants: ["p4", "p30", "p2", "p15"]
      },
      {
        id: "cat4_nom2",
        name: "El espiritu navideño del año",
        participants: ["p3", "p16", "p22", "p37"]
      }
    ]
  },
  {
    id: "cat5",
    name: "Humor y personalidad",
    nominations: [
      {
        id: "cat5_nom1",
        name: "El que más café necesita",
        participants: ["p35", "p31", "p28", "p10"]
      },
      {
        id: "cat5_nom2",
        name: "El más misterioso(nadie sabe que hace)",
        participants: ["p1", "p12", "p13", "p27"]
      },
       {
        id: "cat5_nom2",
        name: "El que siempre tiene hambre)",
        participants: ["p28", "p20", "p11", "p22"]
      }

      
    ]
  },
  {
    id: "cat6",
    name: "Oficina y habitos",
    nominations: [
      {
        id: "cat6_nom1",
        name: "El escritorio más ordenado",
        participants: ["p3", "p5", "p23", "p26"]
      },
      {
        id: "cat6_nom2",
        name: "El que nunca apaga la computadora",
        participants: ["p25", "p30", "p34", "p24"]
      }
    ]
  },
  {
    id: "cat7",
    name: "Espiritu navideño extra",
    nominations: [
      {
        id: "cat7_nom1",
        name: "EL que mas disfruta el secret santa",
        participants: ["p3", "p29", "p4", "p16"]
      },
    
    ]
  },
  {
    id: "cat8",
    name: "Reconocimientos especiales",
    nominations: [
      {
        id: "cat8_nom1",
        name: "El que nunca falta a las celebraciones",
        participants: ["p30", "p1", "p37", "p19"]
      },
  
    ]
  },
  {
    id: "cat9",
    name: "Personalidad y estilo",
    nominations: [
      {
        id: "cat9_nom1",
        name: "La más fashionista",
        participants: ["p34", "p17", "p20", "p25"]
      },
      {
        id: "cat9_nom2",
        name: "El más fashionista",
        participants: ["p7", "p32", "p24", "p35"]
      }
    ]
  },
  {
    id: "cat10",
    name: "Vida laboral divertida",
    nominations: [
      {
        id: "cat10_nom1",
        name: "El más Multitareas",
        participants: ["p14", "p25", "p26", "p8"]
      },
      {
        id: "cat10_nom2",
        name: "El mejor compañero",
        participants: ["p1", "p2", "p3", "p4","p5", "p6", "p7", "p8","p9", "p10", "p11", "p12","p13", "p14", "p15", "p16","p17", "p18", "p19", "p20","p21", "p22", "p23", "p24","p25", "p26", "p27", "p28", "p29", "p30", "p31", "p32", "33", "p34", "p35", "p36", "p37", "p38"]
      }
    ]
  },
  
];
   


