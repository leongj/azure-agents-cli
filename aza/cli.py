from __future__ import annotations
import os
import json
import typer
from rich.console import Console
from typing import Optional
from .api import list_agents, list_threads, get_thread, ApiError, list_runs

app = typer.Typer(help="Azure Agents CLI")
agents_app = typer.Typer(help="Manage agents")
app.add_typer(agents_app, name="agents")
threads_app = typer.Typer(help="Manage threads")
app.add_typer(threads_app, name="threads")
runs_app = typer.Typer(help="Manage runs (thread executions)")
threads_app.add_typer(runs_app, name="runs")
app.add_typer(runs_app, name="runs")  # top-level alias for runs
console = Console()

@agents_app.command("list")
def agents_list(
    project_uri: Optional[str] = typer.Option(
        None,
        "--project-uri",
        help="Project endpoint (defaults to PROJECT_ENDPOINT env var)",
    ),
    output: str = typer.Option("json", "--output", "-o", help="Output format: json (only)"),
):
    """List agents for a project. JSON only (default). If --project-uri omitted, uses PROJECT_ENDPOINT env var."""
    if not project_uri:
        project_uri = os.getenv("PROJECT_ENDPOINT")
        if not project_uri:
            console.print("[red]Error:[/red] --project-uri not provided and PROJECT_ENDPOINT env var not set.")
            raise typer.Exit(2)

    try:
        agents = list_agents(project_uri)
    except ApiError as e:
        console.print(f"[red]Error:[/red] {e}")
        raise typer.Exit(1)

    console.print_json(data={"agents": agents})

@threads_app.command("list")
def threads_list(
    project_uri: Optional[str] = typer.Option(
        None,
        "--project-uri",
        help="Project endpoint (defaults to PROJECT_ENDPOINT env var)",
    ),
    output: str = typer.Option("json", "--output", "-o", help="Output format: json (only)"),
):
    """List threads for a project (JSON only)."""
    if not project_uri:
        project_uri = os.getenv("PROJECT_ENDPOINT")
        if not project_uri:
            console.print("[red]Error:[/red] --project-uri not provided and PROJECT_ENDPOINT env var not set.")
            raise typer.Exit(2)

    try:
        threads = list_threads(project_uri)
    except ApiError as e:
        console.print(f"[red]Error:[/red] {e}")
        raise typer.Exit(1)

    console.print_json(data={"threads": threads})

@threads_app.command("show")
def thread_show(
    thread_id: str = typer.Argument(..., help="Thread ID"),
    project_uri: Optional[str] = typer.Option(None, "--project-uri", help="Project endpoint (defaults to PROJECT_ENDPOINT env var)"),
    output: str = typer.Option("json", "--output", "-o", help="Output format: json (only)"),
):
    """Show details for a thread (JSON only)."""
    if not project_uri:
        project_uri = os.getenv("PROJECT_ENDPOINT")
        if not project_uri:
            console.print("[red]Error:[/red] --project-uri not provided and PROJECT_ENDPOINT env var not set.")
            raise typer.Exit(2)
    try:
        t = get_thread(project_uri, thread_id)
    except ApiError as e:
        console.print(f"[red]Error:[/red] {e}")
        raise typer.Exit(1)

    console.print_json(data=t)

@runs_app.command("list")
def runs_list(
    thread_id: str = typer.Argument(..., help="Thread ID whose runs to list"),
    project_uri: Optional[str] = typer.Option(None, "--project-uri", help="Project endpoint (defaults to PROJECT_ENDPOINT env var)"),
    output: str = typer.Option("json", "--output", "-o", help="Output format: json (only)"),
):
    """List runs for a thread (JSON only). Usage: aza threads runs list <thread_id> [--project-uri ...]"""
    if not project_uri:
        project_uri = os.getenv("PROJECT_ENDPOINT")
        if not project_uri:
            console.print("[red]Error:[/red] --project-uri not provided and PROJECT_ENDPOINT env var not set.")
            raise typer.Exit(2)
    try:
        runs = list_runs(project_uri, thread_id)
    except ApiError as e:
        console.print(f"[red]Error:[/red] {e}")
        raise typer.Exit(1)

    console.print_json(data={"runs": runs})

if __name__ == "__main__":  # pragma: no cover
    app()
