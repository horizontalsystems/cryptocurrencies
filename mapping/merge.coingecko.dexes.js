const axios = require('axios');
const fs = require('fs')

//--------------------------------------------

const pathCoinGeckoDexes = './config/dexes.json'

//--------------------------------------------

async function saveFile(path, data) {
  fs.writeFileSync(path, data)
}

function readFile(path) {
  return fs.readFileSync(path)
}

//--------------------------------------------

async function fetchDexList(page, itemPerPage = 250){
  try{
    await new Promise(r => setTimeout(r, 1000));

    const url = `https://api.coingecko.com/api/v3/exchanges?per_page=${itemPerPage}&page=${page}`
    const { data: resp } = await axios.get(url)

    if(resp){
        return resp
    }
    return null

  } catch(e){
    console.log('Error', e)
  }
}
//--------------------------------------------
async function mergeDexes(){
  let dexList = []
  let page = 1
  let dexesResponse = []

  do{
    dexesResponse = await fetchDexList(page++ , itemPerPage = 250)

    dexesResponse.forEach(item => {
      const dex = {
        id: item.id,
        name: item.name,
        image_url: item.image
      }
      console.log(`Dex: ${item.name}`)
      dexList.push(dex)
    })
  } while(dexesResponse.length > 0)

  if(dexList.length > 0){
    await saveFile(pathCoinGeckoDexes, JSON.stringify(dexList))
  }

  return "Completed"

}
//--------------------------------------------

mergeDexes().then(response => {
  console.log(response)
})

