# Pépito Trader

The project simulates buying and selling BTC based on the logs of [Pepito Catto](https://x.com/PepitoTheCat).

# Pre-requisites
- [NodeJS](https://nodejs.org/en/download) (tested with v23.5.0)

# Setup
1. Clone the repository

``` 
git clone git@github.com:<>/pepitotrader.git
```

2. Install dependencies
```
cd pepitotrader
npm i
```

3. Setup data 
```
mkdir data
cd data
```
You need to setup two data files:
1. [Historical BTC price](https://www.kaggle.com/datasets/mczielinski/bitcoin-historical-data) - Download & extract the file `btcusd_1-min_data.csv`
2. [Pepito Adventure log](https://github.com/Clement87/Pepito-data/blob/main/tweets.json) - See note below as this is pruned 

- Execute the script
```
node meow.mjs  --initTrading --pepitoTrade
```
- `initTrading` - Flag creates an intermediate file which matches pepitos in & outs with the closest 1 minute BTC price.
- `pepitoTrade` - Executes the buy/sell based on the matched price. This creates a equity balance curve.

You can use the flags independently or in combination. If you update any data files, you need to run them both.

# Notes
- The current data (see below) ; has some in-consistencies as not every out is matched to a in message.
The current calculation skips these inconsistencies and matches the first out to the first in message.
Any repetitions on either side or between the two are skipped.

Ex :
```
[OUT] , OUT , OUT , [IN] , IN , [OUT] , [IN]
```
In the above stream , the first IN message is matched to the first OUT message ( marked in brackets).
These together comprise a trade. I.e. buy when pepito goes out and sell when pepito comes in. 

- The BTC price data starts from Jan 1, 2012. However, the pepito logs start from Nov 13, 2011, so you need
to prune this data set.

# Pépito raw data
- BTC price source with 1 minute resolution :https://www.kaggle.com/datasets/mczielinski/bitcoin-historical-data
- Pepito Cat Adventure logs : https://github.com/Clement87/Pepito-data/blob/main/tweets.json