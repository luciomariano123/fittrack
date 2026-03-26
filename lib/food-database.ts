export interface FoodItem {
  name: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export const FOOD_DATABASE: FoodItem[] = [
  { name: "Pechuga de pollo", kcal: 165, protein: 31, carbs: 0, fat: 3.6 },
  { name: "Arroz integral cocido", kcal: 130, protein: 3, carbs: 28, fat: 1 },
  { name: "Avena", kcal: 389, protein: 17, carbs: 66, fat: 7 },
  { name: "Huevo entero", kcal: 155, protein: 13, carbs: 1, fat: 11 },
  { name: "Banana", kcal: 89, protein: 1, carbs: 23, fat: 0.3 },
  { name: "Yogur griego natural", kcal: 59, protein: 10, carbs: 3.6, fat: 0.4 },
  { name: "Aceite de oliva", kcal: 884, protein: 0, carbs: 0, fat: 100 },
  { name: "Manzana", kcal: 52, protein: 0.3, carbs: 14, fat: 0.2 },
  { name: "Leche entera", kcal: 61, protein: 3.2, carbs: 4.7, fat: 3.3 },
  { name: "Queso cottage", kcal: 98, protein: 11, carbs: 3.4, fat: 4.3 },
  { name: "Atún en agua", kcal: 116, protein: 26, carbs: 0, fat: 1 },
  { name: "Papa cocida", kcal: 77, protein: 2, carbs: 17, fat: 0.1 },
  { name: "Batata cocida", kcal: 86, protein: 1.6, carbs: 20, fat: 0.1 },
  { name: "Lenteja cocida", kcal: 116, protein: 9, carbs: 20, fat: 0.4 },
  { name: "Garbanzos cocidos", kcal: 164, protein: 8.9, carbs: 27, fat: 2.6 },
  { name: "Pan integral", kcal: 247, protein: 9, carbs: 48, fat: 3.4 },
  { name: "Pan blanco", kcal: 265, protein: 8, carbs: 51, fat: 2.5 },
  { name: "Manteca", kcal: 717, protein: 0.9, carbs: 0.1, fat: 81 },
  { name: "Almendras", kcal: 579, protein: 21, carbs: 22, fat: 50 },
  { name: "Nueces", kcal: 654, protein: 15, carbs: 14, fat: 65 },
  { name: "Naranja", kcal: 47, protein: 0.9, carbs: 12, fat: 0.1 },
  { name: "Frutilla", kcal: 32, protein: 0.7, carbs: 7.7, fat: 0.3 },
  { name: "Pera", kcal: 57, protein: 0.4, carbs: 15, fat: 0.1 },
  { name: "Uva", kcal: 67, protein: 0.6, carbs: 17, fat: 0.4 },
  { name: "Durazno", kcal: 39, protein: 0.9, carbs: 10, fat: 0.3 },
  { name: "Zanahoria", kcal: 41, protein: 0.9, carbs: 10, fat: 0.2 },
  { name: "Brócoli", kcal: 34, protein: 2.8, carbs: 7, fat: 0.4 },
  { name: "Espinaca", kcal: 23, protein: 2.9, carbs: 3.6, fat: 0.4 },
  { name: "Tomate", kcal: 18, protein: 0.9, carbs: 3.9, fat: 0.2 },
  { name: "Lechuga", kcal: 15, protein: 1.4, carbs: 2.9, fat: 0.2 },
  { name: "Carne vacuna magra", kcal: 250, protein: 26, carbs: 0, fat: 15 },
  { name: "Salmón", kcal: 208, protein: 20, carbs: 0, fat: 13 },
  { name: "Proteína whey", kcal: 380, protein: 80, carbs: 8, fat: 4 },
  { name: "Granola", kcal: 471, protein: 10, carbs: 64, fat: 20 },
  { name: "Miel", kcal: 304, protein: 0.3, carbs: 82, fat: 0 },
  { name: "Dulce de leche", kcal: 320, protein: 6.7, carbs: 55, fat: 8 },
  { name: "Fideos cocidos", kcal: 158, protein: 5.5, carbs: 31, fat: 0.9 },
  { name: "Arroz blanco cocido", kcal: 130, protein: 2.7, carbs: 28, fat: 0.3 },
  { name: "Quinoa cocida", kcal: 120, protein: 4.4, carbs: 21, fat: 1.9 },
  { name: "Boniato", kcal: 118, protein: 1.5, carbs: 28, fat: 0.1 },
  { name: "Ricotta", kcal: 174, protein: 11, carbs: 3, fat: 13 },
  { name: "Clara de huevo", kcal: 52, protein: 11, carbs: 0.7, fat: 0.2 },
  { name: "Cacao en polvo sin azúcar", kcal: 228, protein: 20, carbs: 58, fat: 14 },
  { name: "Maní", kcal: 567, protein: 26, carbs: 16, fat: 49 },
  { name: "Mantequilla de maní", kcal: 588, protein: 25, carbs: 20, fat: 50 },
  { name: "Leche descremada", kcal: 35, protein: 3.6, carbs: 5, fat: 0.1 },
  { name: "Kefir", kcal: 52, protein: 3.8, carbs: 4.5, fat: 1.3 },
  { name: "Palta", kcal: 160, protein: 2, carbs: 9, fat: 15 },
  { name: "Choclo cocido", kcal: 96, protein: 3.4, carbs: 21, fat: 1.5 },
  { name: "Milanesa de pollo", kcal: 230, protein: 22, carbs: 12, fat: 10 },
];

export function searchFood(query: string): FoodItem[] {
  if (!query || query.trim().length === 0) return FOOD_DATABASE.slice(0, 10);
  const q = query.toLowerCase().trim();
  return FOOD_DATABASE.filter((food) =>
    food.name.toLowerCase().includes(q)
  ).slice(0, 20);
}
