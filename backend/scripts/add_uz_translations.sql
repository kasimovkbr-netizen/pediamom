-- Add Uzbek translation columns to knowledge_base
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS title_uz TEXT;
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS summary_uz TEXT;
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS content_uz TEXT;

-- Update existing articles with Uzbek translations
UPDATE knowledge_base SET
  title_uz = 'Bolalarda antibiotikdan ortiqcha foydalanish',
  summary_uz = 'Keraksiz antibiotiklar bolangizning sog''lig''iga qanday zarar yetkazadi.',
  content_uz = 'Antibiotiklar bakterial infeksiyalarni davolash uchun mo''ljallangan. Ularni virusli kasalliklarda (shamollash, gripp) qo''llash foydasiz va zararli.

Asosiy muammolar:
- Antibiotikga chidamlilik rivojlanadi
- Foydali ichak bakteriyalari nobud bo''ladi
- Allergik reaktsiyalar yuzaga kelishi mumkin
- Keyingi davolash qiyinlashadi

Shifokor ko''rsatmasiz antibiotik bermang. Har qanday kasallikda avval pediatrga murojaat qiling.'
WHERE title = 'Antibiotic Overuse in Children';

UPDATE knowledge_base SET
  title_uz = 'Bolaning immunitetini kuchaytiruvchi 5 ta oziq-ovqat',
  summary_uz = 'Bolangizning immunitetini mustahkamlash uchun oddiy ovqatlanish o''zgarishlari.',
  content_uz = 'To''g''ri ovqatlanish bolaning immunitetini kuchaytiradi va kasalliklarga qarshi kurashishga yordam beradi.

Immunitetni kuchaytiruvchi oziq-ovqatlar:
1. Sitrus mevalar (apelsin, limon) — C vitamini
2. Sarimsoq — tabiiy antibiotik
3. Zanjabil — yallig''lanishga qarshi
4. Qovoq — A vitamini
5. Yogurt — probiotiklar

Har kuni turli xil sabzavot va mevalar bering. Shakar va fast-food ni kamaytiring.'
WHERE title = '5 Foods That Boost Your Child''s Immunity';

UPDATE knowledge_base SET
  title_uz = 'Emlanganidan keyin nima kutish kerak',
  summary_uz = 'Oddiy reaktsiyalar va qachon shifokorga murojaat qilish kerak.',
  content_uz = 'Emlash — bolani xavfli kasalliklardan himoya qilishning eng ishonchli usuli.

Oddiy reaktsiyalar (1-3 kun):
- Inya joyi qizarishi va og''riq
- Hafif isitma (37-38°C)
- Bezovtalik, yig''lash
- Ishtahaning kamayishi

Shifokorga murojaat qiling agar:
- Harorat 39°C dan oshsa
- 3 kundan ko''p davom etsa
- Kuchli allergik reaktsiya bo''lsa
- Bola juda kasal ko''rinsa

Emlash joyiga sovuq kompres qo''ying. Paratsetamol bering (shifokor ko''rsatmasi bilan).'
WHERE title = 'What to Expect After Vaccination';

UPDATE knowledge_base SET
  title_uz = 'O''zbekiston milliy emlash jadvali',
  summary_uz = 'O''zbekistonda bolalar uchun majburiy emlashlar bo''yicha to''liq qo''llanma.',
  content_uz = 'O''zbekiston Sog''liqni saqlash vazirligi tasdiqlagan emlash jadvali:

Tug''ilganda: BCG (sil), Gepatit B
1 oy: Gepatit B (2-doza)
2 oy: DTP, Polio, Hib, Pnevmokokk
3 oy: DTP, Polio, Hib
4 oy: DTP, Polio, Hib, Pnevmokokk
6 oy: Gepatit B (3-doza)
12 oy: Qizamiq, Epidemik parotit, Qizilcha (MMR)
18 oy: DTP (revaksinatsiya), Polio
6 yosh: DTP, Polio, MMR (revaksinatsiya)

Barcha emlashlar bepul va majburiy. Vaqtida emlatish muhim!'
WHERE title = 'Uzbekistan National Vaccination Schedule';

UPDATE knowledge_base SET
  title_uz = 'O''sib kelayotgan bolalar uchun temirga boy oziq-ovqatlar',
  summary_uz = 'To''g''ri ovqatlanish bilan temir tanqisligini oldini oling.',
  content_uz = 'Temir tanqisligi — bolalarda eng keng tarqalgan muammo. U charchoq, o''quv qobiliyatining pasayishiga olib keladi.

Temirga boy oziq-ovqatlar:
- Qizil go''sht (mol, qo''y)
- Jigar
- Loviya va no''xat
- Tuxum sarig''i
- Pomidor va qovoq
- Grenat va olcha

Maslahatlar:
- C vitamini bilan birga iste''mol qiling (temir yaxshi so''riladi)
- Choy va qahvani ovqatdan keyin iching (temir so''rilishini kamaytiradi)
- Shifokor ko''rsatmasi bilan temir qo''shimchalari bering'
WHERE title = 'Iron-Rich Foods for Growing Children';

UPDATE knowledge_base SET
  title_uz = 'Maktab yoshidagi bolalar uchun sog''lom gazaklar',
  summary_uz = 'Bolalar yoqtiradigan foydali gazak g''oyalari.',
  content_uz = 'To''g''ri gazaklar bolaning energiyasini saqlaydi va konsentratsiyasini yaxshilaydi.

Foydali gazaklar:
- Meva va sabzavot bo''laklari
- Yogurt va meva
- Yong''oq va quruq mevalar
- Tuxum
- Pishloq va non
- Smoothie

Qochish kerak:
- Chips va krakker
- Shakarli ichimliklar
- Konfet va shokolad
- Fast-food

Gazakni oldindan tayyorlab qo''ying — bola ochganda sog''lom variant tayyor bo''lsin.'
WHERE title = 'Healthy Snacks for School-Age Children';

UPDATE knowledge_base SET
  title_uz = 'Yosh bo''yicha tavsiya etilgan uyqu soatlari',
  summary_uz = 'Bolangizga qancha uyqu kerak?',
  content_uz = 'Yetarli uyqu bolaning jismoniy va aqliy rivojlanishi uchun muhim.

Yosh bo''yicha tavsiyalar:
- Yangi tug''ilgan (0-3 oy): 14-17 soat
- Chaqaloq (4-11 oy): 12-15 soat
- Kichik bola (1-2 yosh): 11-14 soat
- Maktabgacha (3-5 yosh): 10-13 soat
- Maktab yoshi (6-13 yosh): 9-11 soat
- O''smirlar (14-17 yosh): 8-10 soat

Uyqu yetishmasligi belgilari:
- Kayfiyat o''zgarishi
- Konsentratsiya qiyinligi
- Immunitetning pasayishi
- O''sishning sekinlashishi'
WHERE title = 'Recommended Sleep Hours by Age';

UPDATE knowledge_base SET
  title_uz = 'Ishlayotgan uxlash tartibini yaratish',
  summary_uz = 'Bolangizni tezroq uxlatishga yordam beradigan bosqichma-bosqich qo''llanma.',
  content_uz = 'Muntazam uxlash tartibi bolaga tezroq uxlashga yordam beradi.

Samarali tartib (30-45 daqiqa):
1. Ekranlarni o''chiring (uxlashdan 1 soat oldin)
2. Iliq vanna (10 daqiqa)
3. Pijama kiyish
4. Tish tozalash
5. Kitob o''qish yoki ertak aytish
6. Xona haroratini pasaytiring (18-20°C)
7. Qorong''ilik va jimlik

Muhim qoidalar:
- Har kuni bir xil vaqtda uxlating
- Dam olish kunlari ham tartibni saqlang
- Uxlash joyini faqat uyqu uchun ishlating'
WHERE title = 'Creating a Bedtime Routine That Works';

UPDATE knowledge_base SET
  title_uz = 'Yo''tal sharbatlari: ota-onalar bilishi kerak bo''lgan narsa',
  summary_uz = 'Ko''pgina retseptsiz yo''tal dorilar kichik bolalar uchun xavfli.',
  content_uz = 'Ko''pgina yo''tal sharbatlari 6 yoshgacha bo''lgan bolalar uchun tavsiya etilmaydi.

Xavfli ingredientlar:
- Dekstrometorfan (DXM)
- Difenhidramin
- Kodein
- Pseudoefedrin

Xavfsiz alternativlar:
- Iliq suv va asal (1 yoshdan katta bolalar uchun)
- Burun tomchilari (fiziologik eritma)
- Havo namlagich
- Ko''krak suti (emizikli bolalar uchun)

Shifokor ko''rsatmasiz hech qanday dori bermang. Yo''tal ko''pincha o''z-o''zidan o''tadi.'
WHERE title = 'Cough Syrups: What Parents Must Know';
