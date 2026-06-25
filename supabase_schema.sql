-- Supabase PostgreSQL Table Setup
-- Bu SQL sorgusunu Supabase SQL Editor paneline yapıştırıp çalıştırabilirsiniz (Run).

-- 1. Tablo Oluşturma (Tablo Adı: license_keys)
CREATE TABLE IF NOT EXISTS license_keys (
    id SERIAL PRIMARY KEY,
    satinalanpc VARCHAR(255),
    key VARCHAR(255) UNIQUE NOT NULL,
    miktar INT DEFAULT 0,
    tarih TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    kullanimtarihi TIMESTAMP WITH TIME ZONE,
    used INT DEFAULT 0 -- 0: Kullanılmadı (notused), 1: Kullanıldı (used)
);

-- 2. Tablo Dizinleri (Index) Hızlı Arama İçin
CREATE INDEX IF NOT EXISTS idx_license_keys_key ON license_keys(key);

-- 3. Örnek Verilerin Eklenmesi (İsteğe Bağlı)
INSERT INTO license_keys (key, miktar, used) VALUES 
('CAST-KICK-50', 50, 0),
('CAST-KICK-150', 150, 0),
('CAST-KICK-400', 400, 0),
('SARU-KEY-999', 400, 0),
('UGUR-KEY-777', 150, 0)
ON CONFLICT (key) DO NOTHING;
