
# Travel Risk Dashboard

Author & developer : Elena Maksimovich 

* This MVP is the desktop version 
* You are welcome to contribute if you would like to develop a mobile version or add a feature
* All data is FAKE
* If you want to connect the REAL data to this app, reach out to Elena at contact@weathertrade.net 

To run this project:
python -m http.server 8000

Then run in your browser: 
http://localhost:8000/ 

To create a self-running HTML webapp :
python make_single_file.py

## "Dream Vacation" designer tool 

![Travel Risk Management demo](page-1.png)

## Short term critical event management tool "Hot Potato" 

* You can't avoid a cancelled flight, but you can avoid going to airport while you could just stay at your hotel and take the next flight.
* Reduce the stress and improve your travel experience with timely weather data.
* With this software you will keep your travellers safe and satisfied, no matter last minute storm of rain.
* Save your clients from getting stuck at the airport after a cancelled flight due to bad weather.

![Hot potato - last minute - travel risk management - demo](page-2.png)

##  decision logic Tab-2

[Selected city] <br>
        ↓ <br>
[N travelers affected] <br>
        ↓ <br>
[X disrupted flights] <br>
        ↓ <br>
[Flight cards by destination] <br>
        ↓ <br>
[Next 2 same-destination flights] <br>
        ↓ <br>
[Seat capacity ] <br>
        ↓ <br>
[Hotel priority split] <br>
         ↓ <br>
[Final decision: enough rooms or room gap]