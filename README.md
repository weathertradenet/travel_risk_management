
# Travel Risk Dashboard

* There is only desktop version available
* welcome to contribute if you want to develop a mobile version!
* All data is FAKE : it's an MVP
* If you want to connect the REAL data to this app, reach out to Elena at contact@weathertrade.net 

To run this project:

python -m http.server 8000

Then open in your browser:
http://localhost:8000/ 

To create a self-running HTML webapp :
python make_single_file.py

## Dream vacation designer tool 

![Travel Risk Management demo](page-1.png)

## Short term critical event management tool

Keep your travellers safe and satisfied, no matter last minute weather

Save your clients from getting stuck at the airport after a cancelled flight

![Hot potato - last minute - travel risk management - demo](page-2.png)

Author : Elena Maksimovich @emaksimo


##  decision logic Tab-2

[Selected city]
      ↓
[N travelers affected]
      ↓
[X disrupted flights]
      ↓
[Flight cards by destination]
      ↓
[Next 2 same-destination flights]
      ↓
[Seat capacity test]
      ↓
[Hotel priority split]
      ↓
[Final decision: enough rooms or room gap]