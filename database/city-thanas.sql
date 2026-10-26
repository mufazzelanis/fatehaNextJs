-- Metropolitan (city) police thanas missing from the imported location list.
-- The old fatehabd.com list only had upazilas (Dhaka: Savar, Dhamrai, Keraniganj, Nawabganj, Dohar).
-- Ids start at 10001 so they never clash with imported ids; safe to run again (upsert).
-- City thanas have no unions — the union field is optional at checkout.

-- Dhaka Metropolitan Police (district 47 = Dhaka)
INSERT INTO thanas (id, district_id, name, bn_name)
SELECT v.id, 47, v.name, v.bn_name FROM (
  SELECT 10001 AS id, 'Adabor' AS name, 'আদাবর' AS bn_name
  UNION ALL SELECT 10002, 'Badda', 'বাড্ডা'
  UNION ALL SELECT 10003, 'Banani', 'বনানী'
  UNION ALL SELECT 10004, 'Bangshal', 'বংশাল'
  UNION ALL SELECT 10005, 'Bhashantek', 'ভাষানটেক'
  UNION ALL SELECT 10006, 'Biman Bandar (Airport)', 'বিমানবন্দর'
  UNION ALL SELECT 10007, 'Cantonment', 'ক্যান্টনমেন্ট'
  UNION ALL SELECT 10008, 'Chawkbazar', 'চকবাজার'
  UNION ALL SELECT 10009, 'Dakshinkhan', 'দক্ষিণখান'
  UNION ALL SELECT 10010, 'Darus Salam', 'দারুস সালাম'
  UNION ALL SELECT 10011, 'Demra', 'ডেমরা'
  UNION ALL SELECT 10012, 'Dhanmondi', 'ধানমন্ডি'
  UNION ALL SELECT 10013, 'Gendaria', 'গেন্ডারিয়া'
  UNION ALL SELECT 10014, 'Gulshan', 'গুলশান'
  UNION ALL SELECT 10015, 'Hatirjheel', 'হাতিরঝিল'
  UNION ALL SELECT 10016, 'Hazaribagh', 'হাজারীবাগ'
  UNION ALL SELECT 10017, 'Jatrabari', 'যাত্রাবাড়ী'
  UNION ALL SELECT 10018, 'Kadamtali', 'কদমতলী'
  UNION ALL SELECT 10019, 'Kafrul', 'কাফরুল'
  UNION ALL SELECT 10020, 'Kalabagan', 'কলাবাগান'
  UNION ALL SELECT 10021, 'Kamrangirchar', 'কামরাঙ্গীরচর'
  UNION ALL SELECT 10022, 'Khilgaon', 'খিলগাঁও'
  UNION ALL SELECT 10023, 'Khilkhet', 'খিলক্ষেত'
  UNION ALL SELECT 10024, 'Kotwali', 'কোতোয়ালী'
  UNION ALL SELECT 10025, 'Lalbagh', 'লালবাগ'
  UNION ALL SELECT 10026, 'Mirpur Model', 'মিরপুর মডেল'
  UNION ALL SELECT 10027, 'Mohammadpur', 'মোহাম্মদপুর'
  UNION ALL SELECT 10028, 'Motijheel', 'মতিঝিল'
  UNION ALL SELECT 10029, 'Mugda', 'মুগদা'
  UNION ALL SELECT 10030, 'New Market', 'নিউমার্কেট'
  UNION ALL SELECT 10031, 'Pallabi', 'পল্লবী'
  UNION ALL SELECT 10032, 'Paltan Model', 'পল্টন মডেল'
  UNION ALL SELECT 10033, 'Ramna', 'রমনা'
  UNION ALL SELECT 10034, 'Rampura', 'রামপুরা'
  UNION ALL SELECT 10035, 'Rupnagar', 'রূপনগর'
  UNION ALL SELECT 10036, 'Sabujbagh', 'সবুজবাগ'
  UNION ALL SELECT 10037, 'Shah Ali', 'শাহ আলী'
  UNION ALL SELECT 10038, 'Shahbagh', 'শাহবাগ'
  UNION ALL SELECT 10039, 'Shahjahanpur', 'শাহজাহানপুর'
  UNION ALL SELECT 10040, 'Sher-e-Bangla Nagar', 'শেরেবাংলা নগর'
  UNION ALL SELECT 10041, 'Shyampur', 'শ্যামপুর'
  UNION ALL SELECT 10042, 'Sutrapur', 'সূত্রাপুর'
  UNION ALL SELECT 10043, 'Tejgaon', 'তেজগাঁও'
  UNION ALL SELECT 10044, 'Tejgaon Industrial Area', 'তেজগাঁও শিল্পাঞ্চল'
  UNION ALL SELECT 10045, 'Turag', 'তুরাগ'
  UNION ALL SELECT 10046, 'Uttara East', 'উত্তরা পূর্ব'
  UNION ALL SELECT 10047, 'Uttara West', 'উত্তরা পশ্চিম'
  UNION ALL SELECT 10048, 'Uttarkhan', 'উত্তরখান'
  UNION ALL SELECT 10049, 'Vatara', 'ভাটারা'
  UNION ALL SELECT 10050, 'Wari', 'ওয়ারী'
) v WHERE EXISTS (SELECT 1 FROM districts WHERE id = 47)
ON DUPLICATE KEY UPDATE district_id = VALUES(district_id), name = VALUES(name), bn_name = VALUES(bn_name);

-- Chattogram Metropolitan Police (district 8 = Chattogram; Karnafuli is already listed as an upazila)
INSERT INTO thanas (id, district_id, name, bn_name)
SELECT v.id, 8, v.name, v.bn_name FROM (
  SELECT 10101 AS id, 'Akbar Shah' AS name, 'আকবর শাহ' AS bn_name
  UNION ALL SELECT 10102, 'Bakalia', 'বাকলিয়া'
  UNION ALL SELECT 10103, 'Bandar', 'বন্দর'
  UNION ALL SELECT 10104, 'Bayazid Bostami', 'বায়েজিদ বোস্তামী'
  UNION ALL SELECT 10105, 'Chandgaon', 'চান্দগাঁও'
  UNION ALL SELECT 10106, 'Chawkbazar', 'চকবাজার'
  UNION ALL SELECT 10107, 'Double Mooring', 'ডবলমুরিং'
  UNION ALL SELECT 10108, 'EPZ', 'ইপিজেড'
  UNION ALL SELECT 10109, 'Halishahar', 'হালিশহর'
  UNION ALL SELECT 10110, 'Khulshi', 'খুলশী'
  UNION ALL SELECT 10111, 'Kotwali', 'কোতোয়ালী'
  UNION ALL SELECT 10112, 'Pahartali', 'পাহাড়তলী'
  UNION ALL SELECT 10113, 'Panchlaish', 'পাঁচলাইশ'
  UNION ALL SELECT 10114, 'Patenga', 'পতেঙ্গা'
  UNION ALL SELECT 10115, 'Sadarghat', 'সদরঘাট'
) v WHERE EXISTS (SELECT 1 FROM districts WHERE id = 8)
ON DUPLICATE KEY UPDATE district_id = VALUES(district_id), name = VALUES(name), bn_name = VALUES(bn_name);
