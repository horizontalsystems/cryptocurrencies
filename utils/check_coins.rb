require 'json'

coins = JSON.parse(File.read('../coins.json'))
provider_coins = JSON.parse(File.read('../provider.coins.json'))["coins"]

puts "=== Coins in coins.json not matching provider.coins.json ==="

coins["coins"].each { |coin| 
	if !provider_coins.any? { |pc| 
		pc["id"] == coin["id"] && pc["code"].upcase == coin["code"].upcase
	}
		puts "(#{coin["code"]}) #{coin["name"]} : #{coin["id"]}"
	end
}
