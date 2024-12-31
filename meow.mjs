import { readFile } from 'fs/promises';
import { parse } from 'csv-parse/sync';
import fs from 'fs/promises';
import { createCanvas } from 'canvas';
import Chart from 'chart.js/auto';
import 'chartjs-adapter-date-fns';

const pepitoLogFile = './data/tweets_latest.json';
const pepitoOutFile = './data/pepito_trader.csv'
const btcPriceLogFile = './data/btcusd.csv'

const pepito = [];

const appendArrayToCsvFile = async (filePath, dataArray) => {
    try {
        let fileExists = false;
        try {
            await fs.access(filePath);
            fileExists = true; // File exists, no need to write headers
        } catch (error) {
            console.log("Creating new intermediate file");
        }

        const headers = Object.keys(dataArray[0]).join(',');
        const rows = dataArray.map((obj) => Object.values(obj).join(',')).join('\n');
        const dataToWrite = (fileExists ? '' : headers + '\n') + rows + '\n';
        await fs.appendFile(filePath, dataToWrite, 'utf8');
        console.log('Data successfully appended to the CSV file.');
    } catch (error) {
        console.error('Error appending data to the CSV file:', error);
    }
};

const readBTCPriceData = async (filePath) => {
    try {
        const fileContent = await readFile(filePath, 'utf8');
        let records = parse(fileContent, {
            columns: true, // Use the first row as headers
            skip_empty_lines: true, // Skip empty lines
        });
        return records; // Return parsed data
    } catch (error) {
        console.error('Error reading or parsing the file:', error);
    }
};

function createHumanReadableDate(timestamp) {
    const date = new Date(timestamp * 1000);
    const options = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: 'GMT',
    };
    let result = Intl.DateTimeFormat('en-GB', options).format(date);
    result = result.replace(',', '');
    return result;
}

async function pepitoTrades(startingBalance) {
    let balance = startingBalance
    let tradeCount = 0;
    let balances =[]
    let dates = [];

    try {
        const fileContent = await readFile(pepitoOutFile, 'utf8');
        const records = parse(fileContent, {
            columns: true,
            skip_empty_lines: true,
        });

        let buy_trade_found = false;
        let buy_trade;
        let sell_trade;

        console.log(`Starting balance: ${balance} - ${records.length} records`);
        for (let i = 0; i < records.length; i++) {
            //console.debug(JSON.stringify(records[i]));
            if (!buy_trade_found && !parseInt(records[i].pepito_in)) {
                buy_trade = records[i];
                buy_trade_found = true;
                //console.log('Buy trade:' , JSON.stringify(buy_trade));
            } else if (buy_trade_found && parseInt(records[i].pepito_in)){
                //console.log("Sell trade", JSON.stringify(sell_trade));
                sell_trade = records[i];
                let buyQty = balance/buy_trade.btc_price;
                balance = buyQty * sell_trade.btc_price;
                tradeCount+=2;
                balances.push(balance)
                dates.push(sell_trade.btc_timestamp * 1000)
                buy_trade_found = false;
            }
        }
        console.log(`Final balance : ${balance} ,trades executed : ${tradeCount}`);
        await generateEquityCurve(balances, dates)
    } catch (err) {
        console.error('Error:', err);
    }
}

async function readPepitosAdventures(btcData) {
    try {
        const data = await readFile(pepitoLogFile, 'utf8');
        const jsonData = JSON.parse(data);
        if (Array.isArray(jsonData)) {
            jsonData.forEach(item => {
                  pepito.push(item); // Add the pepito
            });
        }

        let k =0;
        let matchCount =0;
        let dataBatchWriteArray = []

        for (let i = 0 ; i < pepito.length; i++) {
            let dataToAppend = { btc_idx : 0, btc_price: 0,  btc_timestamp : 0 , btc_human_timestamp: "" ,  pepito_log_idx : 0 , pepito_timestamp : 0 , pepito_human_timestamp: "", pepito_in : 0};
            const date = new Date(pepito[i].created_at);
            const unixTimestamp = Math.floor(date.getTime() / 1000);
            dataToAppend.pepito_log_idx = i;
            dataToAppend.pepito_timestamp = unixTimestamp;
            dataToAppend.pepito_human_timestamp = pepito[i].created_at;
            if (pepito[i].way === "in") {
                dataToAppend.pepito_in = 1;
            } else {
                dataToAppend.pepito_in = 0;
            }

            for (let j =k ; j <btcData.length; j++) {
                if (parseInt(btcData[j].Timestamp) > parseInt(unixTimestamp)) {
                    dataToAppend.btc_idx = j;
                    dataToAppend.btc_timestamp = parseInt(btcData[j].Timestamp);
                    dataToAppend.btc_human_timestamp = createHumanReadableDate(parseInt(btcData[j].Timestamp))
                    dataToAppend.btc_price  = btcData[j].Close;
                    matchCount++
                    k++;
                    break;
                }
            }
            dataBatchWriteArray.push(dataToAppend);
            if (i%500 ===0 || i === pepito.length -1) {
                console.log("Traversed Pepito log -" , i , "/" , pepito.length , " matched : " , matchCount);
                await appendArrayToCsvFile(pepitoOutFile, dataBatchWriteArray);
                dataBatchWriteArray.length = 0;
            }
        }
        console.log("Finished parsing");
    } catch (err) {
        console.error('Error:', err);
    }
}

function parseFlags(args) {
    const flags = {};
    args.forEach((arg, index) => {
        if (arg.startsWith('--')) {
            const key = arg.slice(2);
            const value = args[index + 1] && !args[index + 1].startsWith('--') ? args[index + 1] : true;
            flags[key] = value;
        }
    });
    return flags;
}


async function generateEquityCurve(yAxisBalances, xAxisDates){
    // Generate the chart
    const width = 800; // Chart width
    const height = 600; // Chart height
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: xAxisDates, // Use x-axis data
            datasets: [{
                label: 'Equity Curve (Balance)',
                data: yAxisBalances, // Use y-axis data
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderWidth: 2,
                fill: true,
            }],
        },
        options: {
            responsive: false,
            scales: {
                x: {
                    type: 'time', // Time scale for Unix timestamps
                    time: {
                        unit: 'day',
                        displayFormats: {
                            day: 'dd/MM/yyyy', // Display DD/MM/YYYY format
                        },
                        tooltipFormat: 'dd/MM/yyyy', // Tooltip format
                    },
                    title: {
                        display: true,
                        text: 'Date',
                    },
                },
                y: {
                    title: {
                        display: true,
                        text: 'Balance',
                    },
                },
            },
        },
    });

    const outputPath = 'balanceEquityCurve.png';
    const buffer = canvas.toBuffer('image/png');
    await fs.writeFile(outputPath, buffer);
    console.log(`Equity curve saved as ${outputPath}`);
}

const main = async () => {
    try {
        const args = process.argv.slice(2);
        const flags = parseFlags(args);
        if (flags.initTrading) {
            let btcData = await readBTCPriceData(btcPriceLogFile); // Await parsed data
            await readPepitosAdventures(btcData);
        }
        if (flags.pepitoTrade){
            let startingBalance = 9.0
            console.log("Begin Trading");
            if(flags.startingBalance){
                startingBalance = parseInt(flags.startingBalance);
            }
            pepitoTrades(startingBalance);
        }

    } catch (error) {
        console.error('Error:', error);
    }
};

main();
