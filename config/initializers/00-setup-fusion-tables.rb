configure do   
  begin
    yaml = YAML.load_file("config/config.yml")[settings.environment.to_s]
    yaml.each_pair do |key, value|
      set(key.to_sym, value)
    end
  rescue Errno::ENOENT
    puts "Setup Fusion Tables: config.yml file not found"
  end
end

begin
  google_account = settings.google_account.to_s
  google_password = settings.google_password.to_s
rescue
  google_account = ENV['google_account']
  google_password = ENV['google_password'] 
end

unless google_account.nil? || google_account == '' || google_account == 'xxxxxxx'
  puts 'enabling fusion_tables gem connection'
  FT = GData::Client::FusionTables.new
  FT.clientlogin(google_account, google_password)
end