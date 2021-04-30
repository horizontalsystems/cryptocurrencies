var levenshtein = require('fast-levenshtein');
const CoinGecko = require('coingecko-api');
const coinGeckoClient = new CoinGecko();
const fs = require('fs')

//--------------------------------------------

const pathCoinCategories = '../coins.json'
const pathCoinGeckoCoins = './config/coingecko.coins.json'
const pathCryptocomCoins = './config/cryptocompare.coins.json'
const pathProviderIds = './config/provider.coins.json'
const pathAppCoins = './config/app.coins.json'
const pathMergedCoins = './config/merged.json'
const pathNotMergedCryptocomCoins = './config/notmerged_cryptocom.json'
const pathNotMergedCoinGeckoCoins = './config/notmerged_coingecko.json'
const pathExceptionalProviderIds = './config/exceptional.provider.coins.json'

const fileCoinGeckoCoins = readFile(pathCoinGeckoCoins)
const fileCryptocomCoins = readFile(pathCryptocomCoins)

const jsonCg = JSON.parse(fileCoinGeckoCoins)
const coinGeckoCoins = jsonCg

const jsonCc = JSON.parse(fileCryptocomCoins)
const cryptocomCoins = jsonCc

let mergedCoinsList = []

let coinGeckoBep2Map = {
    "binanceidr": "BIDR-0E9",
    "binance-krw": "BKRW-AB7",
    "binance-vnd": "BVND-244",
    "concierge-io": "AVA-645",
    "snapparazzi": "RNO-14E",
    "trust-wallet-token": "TWT-8C2",
    "wab-network": "BAW-DFB"
}

//--------------------------------------------
function sortByProperty(property) {
    return (a, b) => {
        if (a[property] > b[property]) return 1
        if (a[property] < b[property]) return -1

        return 0
    }
}

async function saveFile(path, data) {
    fs.writeFileSync(path, data)
}

function readFile(path) {
    return fs.readFileSync(path)
}

//--------------------------------------------
function getPlatformInfos(coinGeckoCoin){
    let platforms = []

    if (coinGeckoCoin.platforms) {
        if (Object.keys(coinGeckoCoin.platforms).length > 0){
            for (const [platformName, platformValue] of Object.entries(coinGeckoCoin.platforms)) {
                if(platformValue){
                    if(platformName === 'binancecoin'){
                        platforms.push({ name:'binance', type:'bep2', address: platformValue, coinId: `bep2|${platformValue}`})
                    }
                    else if(platformName === 'ethereum'){
                        platforms.push({ name:'ethereum', type:'erc20', address: platformValue, coinId: `erc20|${platformValue}`})
                    }
                    else if(platformName === 'binance-smart-chain'){
                        platforms.push({ name:'binance-smart-chain', type:'bep20', address: platformValue, coinId: `bep20|${platformValue}`})
                    }
                    // else{
                    //     return { name:platformName, type:'', address: platformValue, coinId: `${platformName}|${platformValue}`}
                    // }
                } else {
                    if(platformName === 'binancecoin' && coinGeckoBep2Map[coinGeckoCoin.id]){
                        platforms.push({ name:'binance', type:'bep2', address: coinGeckoBep2Map[coinGeckoCoin.id], coinId: `bep2|${coinGeckoBep2Map[coinGeckoCoin.id]}`})
                    }
                }
            }
        }
    }

    if (platforms.length == 0) {
        platforms.push({ platform:'',  address:'', coinId: `unsupported|${coinGeckoCoin.id}`})
    }

    return platforms
}
//--------------------------------------------
function generateIds(coinGeckoCoin){
    if(coinGeckoCoin.name.toLowerCase() === "bitcoin" )
        return [{ name:'', type:'', address:'', coinId: "bitcoin"}]
    else if(coinGeckoCoin.name.toLowerCase() === "ethereum" )
        return [{ name:'', type:'', address:'', coinId: "ethereum"}]
    else if(coinGeckoCoin.name.toLowerCase() === "binance coin" )
        return [{ name:'', type:'', address:'', coinId: "bep2|BNB"}]
    else if(coinGeckoCoin.name.toLowerCase() === "zcash" )
        return [{ name:'', type:'', address:'', coinId: "zcash"}]
    else if(coinGeckoCoin.name.toLowerCase() === "litecoin" )
        return [{ name:'', type:'', address:'', coinId: "litecoin"}]
    else if(coinGeckoCoin.name.toLowerCase() === "dash" )
        return [{ name:'', type:'', address:'', coinId: "dash"}]
    else if(coinGeckoCoin.name.toLowerCase() === "bitcoin cash" )
        return [{ name:'', type:'', address:'' , coinId: "bitcoinCash"}]
    else
        return getPlatformInfos(coinGeckoCoin)
}

//--------------------------------------------

function mergeCoinGeckoCoins(){
    const newCoins = []

    for(const coinGeckoCoin of coinGeckoCoins){
        const platforms = generateIds(coinGeckoCoin)
        for (const platform of platforms) {
            const coinId = platform.coinId
            const platfromJson = { name: platform.name, address: platform.address, type: platform.type }

            if(platform.name){
                newCoins.push({
                    id : coinId,
                    code : coinGeckoCoin.symbol,
                    name : coinGeckoCoin.name,
                    platform : platfromJson,
                    external_id: {
                        coingecko: coinGeckoCoin.id,
                    }
                })
            } else {
                newCoins.push({
                    id : coinId,
                    code : coinGeckoCoin.symbol,
                    name : coinGeckoCoin.name,
                    external_id: {
                        coingecko: coinGeckoCoin.id,
                    }
                })
            }

            // -- Dublicate Record ---------------
            if(platform.coinId == 'bep2|BNB'){
                newCoins.push({
                    id : 'binanceSmartChain',
                    code : coinGeckoCoin.symbol,
                    name : 'Binance Smart Chain',
                    external_id: {
                        coingecko: coinGeckoCoin.id,
                        cryptocompare: `BNB`,
                    }
                })
            }
        }

    }

    saveFile(pathAppCoins, JSON.stringify({coins : newCoins}))
}

//--------------------------------------------
function compareStrings(str1, str2){

    if(!str1 || !str2)
        return 0

    const maxLength = Math.max(str1.length, str2.length)
    const distance = levenshtein.get(str1, str2);
    const ratio = 100 - Number.parseFloat(distance * 100/maxLength)
    return ratio
}
//--------------------------------------------
function addCryptoCompareSmartContractData(appCoin, cryptocomCoin){

    let newAppCoin = appCoin

    if(cryptocomCoin.SmartContractAddress){
        let platformName = ''
        let platformType = ''

        if(cryptocomCoin.BuiltOn == 'ETH'){
            platformName = 'ethereum'
            platformType = 'erc20'
        } else if(cryptocomCoin.BuiltOn == 'TRX'){
            platformName = 'tron'
            platformType = 'tron'
        } else if(cryptocomCoin.BuiltOn == 'BNB'){
            platformName = 'binance'
            platformType = 'bep2'
        }
        newAppCoin.id = `${platformType}|${cryptocomCoin.SmartContractAddress}`
        newAppCoin.platform = { name: platformName, address: cryptocomCoin.SmartContractAddress, type: platformType }
    }

    return newAppCoin
}
//--------------------------------------------

function mergeCryptoCompareCoinsBySmartContract(appCoins, foundcryptocomCoins){
        //  --- Merge coins with Uniq address ------------
        const hasSmartContractCc = foundcryptocomCoins.filter(cryptocomCoin =>
            cryptocomCoin.SmartContractAddress
        )

        const hasSmartContractAppCoins = appCoins.filter(appCoin =>
            appCoin.platform
        )

        const uniqAddressCoinsCc = []
        const uniqAddressCoinsApp = []
        let mergedIndex = 0
        mergedCoinsList.push('*********  Merged By SmartContract (100%) ******************* ')

        for(const appCoin of hasSmartContractAppCoins){

            const found = hasSmartContractCc.filter(cryptocomCoin =>
                cryptocomCoin.SmartContractAddress.trim().toLowerCase() == appCoin.platform.address.trim().toLowerCase()
            )

            if(found.length > 0){

                if(found.length > 1){
                    found.forEach(f => {
                        if(f.Symbol == 'FTT' || f.Symbol == 'WABI' ||  f.Symbol == 'RDN' ){
                            appCoin.external_id['cryptocompare'] = f.Symbol
                            appCoin.description = f.Description
                            uniqAddressCoinsCc.push(f)
                            mergedCoinsList.push(`${++mergedIndex} - ${appCoin.code}-${appCoin.name} --- ${f.Symbol}-${f.CoinName}`)
                        }
                    })
                } else {
                    appCoin.external_id['cryptocompare'] = found[0].Symbol
                    appCoin.description = found[0].Description
                    uniqAddressCoinsCc.push(found[0])
                }
                uniqAddressCoinsApp.push(appCoin)
                mergedCoinsList.push(`${++mergedIndex} - ${appCoin.code}-${appCoin.name} --- ${found[0].Symbol}-${found[0].CoinName}`)
            }
        }
        appCoins = appCoins.filter(appC => uniqAddressCoinsApp.indexOf(appC) === -1 )
        foundcryptocomCoins = foundcryptocomCoins.filter(cc => uniqAddressCoinsCc.indexOf(cc) === -1 )
        console.log(`Merged UniqAddress Coins: ${uniqAddressCoinsApp.length}`)

        return {outCoins: uniqAddressCoinsApp, appCoins: appCoins, foundcryptocomCoins  }
}
//--------------------------------------------
function mergeCryptoCompareCoinsByCodeName(appCoins, foundcryptocomCoins){
        //  --- Merge coins with Code/Name ------------
        const uniqCodesCoinsCc = []
        const uniqCodesCoinsApp = []
        let mergedIndex = mergedCoinsList.length
        mergedCoinsList.push('*********  Merged By Code/Name (100%) ******************* ')

        for(let appCoin of appCoins){

            const found = foundcryptocomCoins.filter(cryptocomCoin =>
                cryptocomCoin.Symbol.trim().toLowerCase() == appCoin.code.trim().toLowerCase()
                && ( cryptocomCoin.CoinName.trim().toLowerCase() == appCoin.name.trim().toLowerCase())
            )

            if(found.length > 0){
                appCoin.external_id['cryptocompare'] = found[0].Symbol
                appCoin.description = found[0].Description

                if(!appCoin.platform && found[0].SmartContractAddress){
                    appCoin = addCryptoCompareSmartContractData(appCoin, found[0])
                }

                uniqCodesCoinsCc.push(found[0])
                uniqCodesCoinsApp.push(appCoin)
                mergedCoinsList.push(`${++mergedIndex} - ${appCoin.code}-${appCoin.name} --- ${found[0].Symbol}-${found[0].CoinName}`)
            }
        }

        appCoins = appCoins.filter(appC => uniqCodesCoinsApp.indexOf(appC) === -1 )
        foundcryptocomCoins = foundcryptocomCoins.filter(cc => uniqCodesCoinsCc.indexOf(cc) === -1 )
        console.log(`Merged UniqCodes and Name Coins: ${uniqCodesCoinsApp.length}`)

        return {outCoins: uniqCodesCoinsApp, appCoins: appCoins, foundcryptocomCoins  }
}

//--------------------------------------------
function mergeCryptoCompareCoinsByCodeNameIdenticRatio(appCoins, foundcryptocomCoins){
    //  --- Merge coins with Code likely name ------------
    const uniqCodesCoinsCc = []
    const uniqCodesCoinsApp = []
    let mergedIndex = mergedCoinsList.length
    mergedCoinsList.push('*********  Merged By Code(100%)  Name (50%) ******************* ')

    for(let appCoin of appCoins){

        const found = foundcryptocomCoins.filter(cryptocomCoin =>
            cryptocomCoin.Symbol.trim().toLowerCase() == appCoin.code.trim().toLowerCase()
            && 50 <= compareStrings(cryptocomCoin.CoinName.trim().toLowerCase(), appCoin.name.trim().toLowerCase())
        )

        if(found.length > 0){
            appCoin.external_id['cryptocompare'] = found[0].Symbol
            appCoin.description = found[0].Description
            //console.log(found[0].CoinName, '-', appCoin.name)
            uniqCodesCoinsCc.push(found[0])
            uniqCodesCoinsApp.push(appCoin)
            mergedCoinsList.push(`${++mergedIndex} - ${appCoin.code}-${appCoin.name} --- ${found[0].Symbol}-${found[0].CoinName}`)
        }
    }
    appCoins = appCoins.filter(appC => uniqCodesCoinsApp.indexOf(appC) === -1 )
    foundcryptocomCoins = foundcryptocomCoins.filter(cc => uniqCodesCoinsCc.indexOf(cc) === -1 )
    console.log(`Merged Name identic ratio Coins: ${uniqCodesCoinsApp.length}`)

    return {outCoins: uniqCodesCoinsApp, appCoins: appCoins, foundcryptocomCoins  }
}

//--------------------------------------------
function mergeCryptoCompareCoinsByCodeIdenticRatio(appCoins, foundcryptocomCoins){
    //  --- Merge coins with Code likely name ------------
    const uniqCodesCoinsCc = []
    const uniqCodesCoinsApp = []
    let mergedIndex = mergedCoinsList.length
    mergedCoinsList.push('*********  Merged By Code(90%) ******************* ')

    for(let appCoin of appCoins){

        const found = foundcryptocomCoins.filter(cryptocomCoin =>
            90 <= compareStrings(cryptocomCoin.Symbol.trim().toLowerCase(), appCoin.code.trim().toLowerCase())
        )

        if(found.length > 0){
            appCoin.external_id['cryptocompare'] = found[0].Symbol
            appCoin.description = found[0].Description
            //console.log(found[0].CoinName, '-', appCoin.name)
            uniqCodesCoinsCc.push(found[0])
            uniqCodesCoinsApp.push(appCoin)
            mergedCoinsList.push(`${++mergedIndex} - ${appCoin.code}-${appCoin.name} --- ${found[0].Symbol}-${found[0].CoinName}`)
        }
    }
    appCoins = appCoins.filter(appC => uniqCodesCoinsApp.indexOf(appC) === -1 )
    foundcryptocomCoins = foundcryptocomCoins.filter(cc => uniqCodesCoinsCc.indexOf(cc) === -1 )
    console.log(`Merged Code identic ratio Coins: ${uniqCodesCoinsApp.length}`)

    return {outCoins: uniqCodesCoinsApp, appCoins: appCoins, foundcryptocomCoins  }
}

//--------------------------------------------
function mergeCryptoCompareCoinsByNameIdenticRatio(appCoins, foundcryptocomCoins){
    //  --- Merge coins with Code likely name ------------
    const uniqCodesCoinsCc = []
    const uniqCodesCoinsApp = []
    let mergedIndex = mergedCoinsList.length
    mergedCoinsList.push('*********  Merged By Code(90%) ******************* ')

    for(let appCoin of appCoins){

        const found = foundcryptocomCoins.filter(cryptocomCoin =>
            90 <= compareStrings(cryptocomCoin.CoinName.trim().toLowerCase(), appCoin.name.trim().toLowerCase())
        )

        if(found.length > 0){
            appCoin.external_id['cryptocompare'] = found[0].Symbol
            appCoin.description = found[0].Description
            //console.log(found[0].CoinName, '-', appCoin.name)
            uniqCodesCoinsCc.push(found[0])
            uniqCodesCoinsApp.push(appCoin)
            mergedCoinsList.push(`${++mergedIndex} - ${appCoin.code}-${appCoin.name} --- ${found[0].Symbol}-${found[0].CoinName}`)
        }
    }
    appCoins = appCoins.filter(appC => uniqCodesCoinsApp.indexOf(appC) === -1 )
    foundcryptocomCoins = foundcryptocomCoins.filter(cc => uniqCodesCoinsCc.indexOf(cc) === -1 )
    console.log(`Merged Name identic ratio Coins: ${uniqCodesCoinsApp.length}`)

    return {outCoins: uniqCodesCoinsApp, appCoins: appCoins, foundcryptocomCoins  }
}

//--------------------------------------------

function mergeCryptoCompareCoins(){
    const appCoinsFile = readFile(pathAppCoins)
    const exceptionalCoins = JSON.parse(readFile(pathExceptionalProviderIds))
    const jsonAppCoins = JSON.parse(appCoinsFile)
    let appCoins = jsonAppCoins.coins
    let foundcryptocomCoins = Object.values(cryptocomCoins.Data)

    //  --- Merge coins with Uniq address ------------
    let out = mergeCryptoCompareCoinsBySmartContract(appCoins, foundcryptocomCoins)
    appCoins = out.appCoins
    foundcryptocomCoins = out.foundcryptocomCoins
    let outCoins = out.outCoins

    //  --- Merge coins with Code/Name ------------
    out = mergeCryptoCompareCoinsByCodeName(appCoins, foundcryptocomCoins)
    appCoins = out.appCoins
    foundcryptocomCoins = out.foundcryptocomCoins
    outCoins = [].concat(outCoins, out.outCoins)

    //  --- Merge coins with  Name  Identic ------------
    out = mergeCryptoCompareCoinsByCodeNameIdenticRatio(appCoins, foundcryptocomCoins)
    appCoins = out.appCoins
    foundcryptocomCoins = out.foundcryptocomCoins
    outCoins =  [].concat(outCoins, out.outCoins)

    //  --- Merge coins with Code Identic  ------------
    out = mergeCryptoCompareCoinsByCodeIdenticRatio(appCoins, foundcryptocomCoins)
    appCoins = out.appCoins
    foundcryptocomCoins = out.foundcryptocomCoins
    outCoins =  ([].concat(outCoins, out.outCoins)).sort(sortByProperty('code'))

    //  --- Merge coins with  Name  Identic ------------
    out = mergeCryptoCompareCoinsByNameIdenticRatio(appCoins, foundcryptocomCoins)
    appCoins = out.appCoins
    foundcryptocomCoins = out.foundcryptocomCoins
    outCoins =  [].concat(outCoins, out.outCoins)

    console.log('Found items:')
    console.log('CoinGecko', appCoins.length, 'CryptoCompare:', foundcryptocomCoins.length)

    const fileAppCoins = readFile(pathAppCoins)
    const jsonAppCoinsOriginal = JSON.parse(fileAppCoins)
    const appCoinsOriginal = jsonAppCoinsOriginal.coins

    appCoinsOriginal.forEach( oAppCoin => {
        const found = outCoins.filter( outCoin => outCoin.id == oAppCoin.id )
        if(found.length > 0){
            oAppCoin.description = found[0].description
            oAppCoin.external_id['cryptocompare'] = found[0].external_id.cryptocompare
        }
    })

    const outProviderCoins = JSON.parse(JSON.stringify(appCoinsOriginal))
    outProviderCoins.forEach(outCoin => {
        delete outCoin['description']
        delete outCoin['platform']
        delete outCoin['links']
    })

    exceptionalCoins.forEach(coin => {
        console.log(coin)
        outProviderCoins.push(coin)
    })

    saveFile(pathAppCoins, JSON.stringify({coins : appCoinsOriginal}))
    saveFile(pathProviderIds, JSON.stringify({coins : outProviderCoins}))

    saveFile(pathMergedCoins, JSON.stringify(mergedCoinsList))

    //--------------------------------------------
    getNotMergedCoins(appCoins, foundcryptocomCoins)
}

//--------------------------------------------
function getNotMergedCoins(appCoins, foundcryptocomCoins){
    mergedCoinsList = []
    appCoins = appCoins.sort(sortByProperty(`code`))
    foundcryptocomCoins = foundcryptocomCoins.sort(sortByProperty('Symbol'))

    let mergedIndex = 0

    for(const appCoin of appCoins){
        const appCoinData = `${appCoin.code} - ${appCoin.name}`
        mergedCoinsList.push(`${++mergedIndex} - ${appCoinData} `)
    }
    saveFile(pathNotMergedCoinGeckoCoins, JSON.stringify(mergedCoinsList))

    mergedIndex = 0
    mergedCoinsList = []

    for(const cryptocomCoin of foundcryptocomCoins){
        const cryptocomCoinData = `${cryptocomCoin.Symbol} - ${cryptocomCoin.CoinName}`
        mergedCoinsList.push(`${++mergedIndex} - ${cryptocomCoinData} `)
    }

    saveFile(pathNotMergedCryptocomCoins, JSON.stringify(mergedCoinsList))

}
//--------------------------------------------

function mergeAppCoinsBySmartContract(appCoins, categoryCoins){

        //  --- Merge coins with Uniq address ------------
        const hasSmartContractCatCoins = categoryCoins.filter(catCoin =>
            catCoin.platform && catCoin.platform.address
        )

        const hasSmartContractAppCoins = appCoins.filter(appCoin =>
            appCoin.platform && appCoin.platform.address
        )

        const uniqCoinsCat= []
        const uniqCoinsApp = []
        let mergedIndex = 0

        mergedCoinsList.push('*********  Merged By SmartContract (100%) ******************* ')

        for(const catCoin of hasSmartContractCatCoins){

            const found = hasSmartContractAppCoins.filter(appCoin =>
                appCoin.platform.address.trim().toLowerCase() == catCoin.platform.address.trim().toLowerCase()
            )

            if(found.length > 0){

                if(found.length > 1){
                } else {
                    catCoin.id = found[0].id
                    catCoin.description = found[0].description
                    uniqCoinsApp.push(found[0])
                }
                uniqCoinsCat.push(catCoin)
            }
        }
        appCoins = appCoins.filter(appC => uniqCoinsApp.indexOf(appC) === -1 )
        categoryCoins = categoryCoins.filter(cc => uniqCoinsCat.indexOf(cc) === -1 )
        console.log(`Merged UniqAddress App Coins: ${uniqCoinsCat.length}`)

        return {outCoins: uniqCoinsCat, appCoins: appCoins, categoryCoins  }

}
//--------------------------------------------

function mergeAppCoinsByCodeNameIdenticRatio(appCoins, categoryCoins){

    //  --- Merge coins with Code/Name address ------------

    const uniqCoinsCat= []
    const uniqCoinsApp = []
    let mergedIndex = 0

    mergedCoinsList.push('*********  Merged By Code/Name (100%) ******************* ')

    for(const catCoin of categoryCoins){

        const found = appCoins.filter(appCoin =>
            appCoin.code.trim().toLowerCase() == catCoin.code.trim().toLowerCase()
            && 70 <= compareStrings(catCoin.name.trim().toLowerCase(), appCoin.name.trim().toLowerCase())
        )

        if(found.length > 0){

            if(found.length > 1){
                console.log('dublicate')
            } else {
                catCoin.id = found[0].id
                catCoin.description = found[0].description
                uniqCoinsApp.push(found[0])
            }
            uniqCoinsCat.push(catCoin)
        }
    }
    appCoins = appCoins.filter(appC => uniqCoinsApp.indexOf(appC) === -1 )
    categoryCoins = categoryCoins.filter(cc => uniqCoinsCat.indexOf(cc) === -1 )
    console.log(`Merged Uniq Code/Name App Coins: ${uniqCoinsCat.length}`)

    return {outCoins: uniqCoinsCat, appCoins: appCoins, categoryCoins  }

}
//--------------------------------------------

function mergeAppCoins(){
    const fileAppCoins = readFile(pathAppCoins)
    let appCoinsJson = JSON.parse(fileAppCoins)
    let appCoins = appCoinsJson.coins

    const fileCoinsCategory = readFile(pathCoinCategories)
    let categoryCoinsJson = JSON.parse(fileCoinsCategory)
    let categoryCoins = categoryCoinsJson.coins

    //  --- Merge coins with Uniq address ------------
    let out = mergeAppCoinsBySmartContract(appCoins, categoryCoins)
    appCoins = out.appCoins
    categoryCoins = out.categoryCoins
    let outCoins = out.outCoins

    //  --- Merge coins with Uniq Code/Name ------------
    out = mergeAppCoinsByCodeNameIdenticRatio(appCoins, categoryCoins)
    appCoins = out.appCoins
    categoryCoins = out.categoryCoins
    outCoins = [].concat(outCoins, out.outCoins)
    notMergedCoins = categoryCoins.filter(cc => outCoins.indexOf(cc) === -1 )

    notMergedCoins.forEach(notMCoin =>
        console.log(`${notMCoin.code} - ${notMCoin.name}`)
    )

    saveFile('./config/coins.json', JSON.stringify(outCoins))

}

//--------------------------------------------
function addLinksData(links){

    let twitterUrl = ''
    let telegramUrl = ''
    let website = ''
    let githubUrl = ''
    let redditUrl = ''

    if(links){

        if(links.homepage[0]) website = links.homepage[0]
        if(links.subreddit_url) redditUrl = links.subreddit_url
        if(links.repos_url){
            if(links.repos_url.github)
                githubUrl = links.repos_url.github[0]
        }

        if (links.twitter_screen_name) {
            twitterUrl = `https://twitter.com/${links.twitter_screen_name}`
        }

        if (links.telegram_channel_identifier) {
            telegramUrl = `https://t.me/${links.telegram_channel_identifier}`
        }
    }

    return {
        website: website,
        whitepaper: '',
        guide: '',
        twitter: twitterUrl,
        github: githubUrl,
        reddit: redditUrl,
        telegram: telegramUrl
    }
}
//--------------------------------------------
async function addCoinGeckoCommunityData(){

    const fileAppCoins = readFile(pathAppCoins)
    let appCoinsJson = JSON.parse(fileAppCoins)
    let appCoins = appCoinsJson.coins

    const fileCoinsCategory = readFile(pathCoinCategories)
    let categoryCoinsJson = JSON.parse(fileCoinsCategory)
    let categoryCoins = categoryCoinsJson.coins

    for (const catCoin of categoryCoins) {

        const found = appCoins.filter(appCoin =>
            appCoin.id.trim().toLowerCase() == catCoin.id.trim().toLowerCase()
        )

        if(found.length > 0){
            await new Promise(r => setTimeout(r, 1000));
            if(found[0].external_id){
                const coinId = found[0].external_id.coingecko
                console.log(`Fetching data for:${found[0].code}`)
                const result = await coinGeckoClient.coins.fetch(coinId, {
                    localization: false,
                    community_data: true,
                    market_data: false,
                    developer_data: false,
                    tickers: false
                })

                if (result.code === 200){
                    catCoin.links = addLinksData(result.data.links)
                }
            }
        }
    }

    saveFile('./config/coins.json', JSON.stringify(categoryCoins))
}
//--------------------------------------------

mergeCoinGeckoCoins()
mergeCryptoCompareCoins()
mergeAppCoins()
//addCoinGeckoCommunityData()

