import sqlite3

conn = sqlite3.connect('data.db')
cursor = conn.cursor()

cursor.execute('PRAGMA table_info(scenarios);')
cols = [row[1] for row in cursor.fetchall()]
print('Existing columns in scenarios:', cols)

if 'tactical_coaching_clue' not in cols:
    cursor.execute('ALTER TABLE scenarios ADD COLUMN tactical_coaching_clue TEXT;')
    print('Added tactical_coaching_clue to scenarios')

if 'target_capabilities' not in cols:
    cursor.execute("ALTER TABLE scenarios ADD COLUMN target_capabilities JSON DEFAULT '[]';")
    print('Added target_capabilities to scenarios')

conn.commit()
conn.close()
print('Database migration finished successfully.')
