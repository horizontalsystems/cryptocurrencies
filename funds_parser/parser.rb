require 'csv'
require 'json'

csv = CSV.read('./funds.csv')
coins = JSON.parse(File.read('../coins.json'))

funds = []

csv.shift
notMatched = []

csv.each { |fund|
	fundId = fund[0].downcase.gsub(/ /, '_').strip
	funds << {id: fundId, name: fund[0], url: fund[1], description: ""}
	# puts fundId
	matched = false

	fund[2].split("\n")
		.filter { |c| !c.strip.empty? }
		.each { |c|
			captures = c.strip.match(/[^()]+\((.+)\)/).captures
			coinCode = captures[0].strip

			coins["coins"].each { |coin|
				if coin["code"] == coinCode
					matched = true
					coinFunds = coin["funds"] || []
					coinFunds << fundId

					coin["funds"] = coinFunds
				end
			}

			notMatched << coinCode unless matched
		}
}

coins["funds"] = funds

puts notMatched.uniq
File.write('../coins.json', JSON.pretty_generate(coins, indent: '    '))

