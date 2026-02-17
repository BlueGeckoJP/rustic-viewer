use vergen_git2::{Emitter, Git2Builder};

fn main() {
    if let Err(e) = git2() {
        panic!("Failed to generate git2 instructions: {e}");
    }

    tauri_build::build()
}

fn git2() -> Result<(), Box<dyn std::error::Error>> {
    let git2 = Git2Builder::default().all().dirty(true).build()?;

    Emitter::default().add_instructions(&git2)?.emit()?;

    Ok(())
}
