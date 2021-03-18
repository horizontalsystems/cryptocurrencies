require 'csv'
require 'json'


def import(csv, coins, funds, category)
	puts "=================================== #{category} ======================================"
	csv.shift
	notMatched = []

	csv.each { |fund|
		fundId = fund[0].downcase.gsub(/ /, '_').strip
		funds << { id: fundId, name: fund[0], url: fund[1], category: category }
		matched = false

		fund[2].split("\n")
			.filter { |c| !c.strip.empty? }
			.each { |c|
				captures = c.strip.match(/[^()]+\((.+)\)/).captures
				coinCode = captures[0].strip

				coins["coins"].each { |coin|
					if coin["code"] == coinCode
						matched = true
						coin["funds"] << fundId
					end
				}

				notMatched << coinCode unless matched
			}
	}

	puts notMatched.uniq

end


coins = JSON.parse(File.read('../coins.json'))
coins["coins"].each { |coin| coin["funds"] = [] }
funds = []
categories = []

Dir["./funds/*"].each { |file|
	name = file[10..-5]
	name = name.gsub(/:/, '/')

	id = name.downcase.gsub(/[^A-z0-9]/, '_').strip

	order = file[8..8].to_i
	categories << { id: id, name: name, order: order }

	import(CSV.read(file), coins, funds, id)
}

coins["funds"] = funds
coins["fund_categories"] = categories


File.write('../coins.json', JSON.pretty_generate(coins, indent: '    '))

