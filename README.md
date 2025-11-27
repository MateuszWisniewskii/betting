# Betting

Kontrakt on–chain napisany w Anchor (Solana), umożliwiający tworzenie wydarzeń sportowych, dodawanie drużyn, obstawianie wyników oraz rozliczanie nagród dla zwycięzców.  

---

## Szybki start 

### Klonowanie repozytorium
```bash
git clone https://github.com/MateuszWisniewskii/betting.git
cd betting
```
### Instalowanie zależności
```bash
yarn install
```
### Budowanie projektu
```bash
anchor build
```
### Testowanie kontraktu
```bash
anchor test
```
## Funkcjonalność kontraktu
### Tworzenie wydarzenia
Kontrakt pozwala administratorowi na utworzenie nowego wydarzenia (eventu), zawierającego m.in.:
- identyfikator wydarzenia,
- nazwę oraz opis wydarzenia,
- czas otwarcia oraz zakończenia głosowania
### Dodawanie drużyn biorących udział w wydarzeniu
Każde wydarzenie może mieć wiele drużyn.
Każdą z dróżyn określa:
- nazwę drużyny
- ilość oddanych głosów
- sumę kwaoty obstawionej na daną drużynę
### Głosowanie / Obstawianie drużyn
Użytkownicy mogą obstawiać jedną z dostępnych drużyn, dokonując wpłaty w SOL.
Kontrakt:
- zapisuje, którą drużynę użytkownik wybrał,
- rejestruje kwotę postawiona przez użytkownika
### Kończenie wydażenia / Umożliwienie graczom odbierania nagród
Po zakończeniu wydarzenia administrator oznacza je jako zakończone oraz wskazuje zwycięską drużynę.
Kontrakt wtedy:
- zamraża możliwość dalszych zakładów,
- otwiera możliwość wypłacania nagród dla użytkowników, którzy obstawili zwycięzcę.
### Odbieranie nagród
Użytkownicy, którzy zagłosowali na zwycięską drużynę, mogą odebrać nagrodę proporcjonalną do ich udziału w całkowitej puli.
Wypłata opiera się na formule:
```bash
nagroda_użytkownika = (jego_stawka / suma_stawki_na_zwycięzcę) * suma_puli
```
Kontrakt weryfikuje, czy:
- wydarzenie jest zakończone,
- użytkownik obstawił zwycięską drużynę,
- użytkownik nie odebrał nagrody wcześniej.
