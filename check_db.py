import sqlite3
import os

db_path = r'd:\PyCharm\Projects\WMSWeb\backend\wms.db'
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT Id, ProdutoId, UnidadeMedidaId, Largura, LarguraUnidade FROM UnidadesProduto LIMIT 10")
    rows = cursor.fetchall()
    print("Id | ProdId | UM_Id | Largura | LarguraUnidade")
    for row in rows:
        print(row)
    conn.close()
else:
    print("DB not found")
