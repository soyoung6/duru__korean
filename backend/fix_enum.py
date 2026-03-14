from services.database import get_db_connection
conn = get_db_connection()
cursor = conn.cursor()
cursor.execute("ALTER TABLE contents MODIFY grade_level ENUM('ELEMENTARY', 'MIDDLE', 'HIGH', 'MIDDLE_HIGH') NOT NULL")
conn.commit()
print('Success')
conn.close()
