// Parses one argv with the shared survey schema (see ../survey.mjs) and prints one compact cell.
use clap::{ArgAction, Parser};

fn size(value: &str) -> Result<String, String> {
    if value == "bad" {
        return Err("bad size".into());
    }
    Ok(value.into())
}

#[derive(Parser, Debug)]
#[command(no_binary_name = true, disable_help_flag = true)]
struct Cli {
    #[arg(short = 'n', long)]
    name: Option<String>,
    #[arg(short = 'v', long, action = ArgAction::SetTrue, overrides_with = "no_verbose")]
    verbose: bool,
    #[arg(long = "no-verbose", action = ArgAction::SetTrue)]
    no_verbose: bool,
    #[arg(short = 'c', long)]
    count: Option<f64>,
    #[arg(short = 's', long, value_parser = size)]
    size: Option<String>,
    #[arg(long = "über")]
    uber: Option<String>,
    #[arg(short = 'é', long, action = ArgAction::SetTrue)]
    eacute: bool,
    rest: Vec<String>,
}

fn main() {
    match Cli::try_parse_from(std::env::args_os().skip(1)) {
        Err(error) => {
            let message = error.to_string();
            println!("error: {}", message.lines().next().unwrap_or("").trim_start_matches("error: "));
        }
        Ok(cli) => {
            let mut parts = Vec::new();
            if let Some(name) = cli.name { parts.push(format!("name={:?}", name)); }
            if cli.verbose { parts.push("verbose=true".into()); }
            if cli.no_verbose { parts.push("verbose=false".into()); }
            if let Some(count) = cli.count { parts.push(format!("count={}", count)); }
            if let Some(size) = cli.size { parts.push(format!("size={:?}", size)); }
            if let Some(uber) = cli.uber { parts.push(format!("über={:?}", uber)); }
            if cli.eacute { parts.push("eacute=true".into()); }
            if !cli.rest.is_empty() { parts.push(format!("_={:?}", cli.rest)); }
            println!("{}", if parts.is_empty() { "(nothing)".into() } else { parts.join(" ") });
        }
    }
}
