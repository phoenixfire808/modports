from pathlib import Path
from openpyxl import Workbook

fixtures = Path(__file__).resolve().parent / "fixtures"
fixtures.mkdir(parents=True, exist_ok=True)


def workbook(path: Path, *, broken_reference: bool = False, formula: bool = False, wrong_type: bool = False) -> None:
    book = Workbook()
    items = book.active
    items.title = "Items"
    items.append(["item_id", "name", "rarity"])
    items.append(["ENT_WOOD", "=\"Wood\"" if formula else "Wood", "common"])
    items.append(["ENT_STONE", "Stone", "common"])
    recipes = book.create_sheet("Recipes")
    recipes.append(["recipe_id", "result_item", "quantity", "enabled"])
    recipes.append(["REC_STONE", "ENT_STONE", 2, True])
    recipes.append(["REC_WOOD", "ENT_MISSING" if broken_reference else "ENT_WOOD", 4, "yes" if wrong_type else True])
    book.save(path)


workbook(fixtures / "model.xlsx")
workbook(fixtures / "broken-reference.xlsx", broken_reference=True)
workbook(fixtures / "formula.xlsx", formula=True)
workbook(fixtures / "wrong-type.xlsx", wrong_type=True)
print(f"Generated XLSX fixtures in {fixtures}")
