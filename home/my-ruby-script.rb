require 'net/http'
require 'uri'
require 'json'

def fetch(url)
  uri = URI(url)
  Net::HTTP.start(uri.host, uri.port, use_ssl: uri.scheme == 'https') do |http|
    request = Net::HTTP::Get.new(uri)
    response = http.request(request)

    unless response.is_a?(Net::HTTPSuccess)
      raise "Unexpected #{response.code} response"
    end

    JSON.parse(response.body)
  end
end

begin
  # Fetch the list of Pokemon
  pokemon_list = fetch('https://pokeapi.co/api/v2/pokemon/')
  pokemon = pokemon_list['results']

  pokemon.each do |p|
    sleep(0.01)  # Wait for 10 milliseconds
    puts "Loading #{p['name']}"

    begin
      fetch(p['url'])
      # We're not storing or using the details, just fetching it as in the original script
    rescue StandardError => e
      puts "\n!!! #{e.message} loading data for #{p['name']} !!!\n"
      exit(1)
    end
  end

rescue StandardError => e
  puts e.message
  exit(1)
end