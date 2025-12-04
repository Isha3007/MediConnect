"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"

export default function DoctorLogin() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true)

    let res = await fetch("http://localhost:5000/api/v1/doctor/doctor-login", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ email, password })
    })

    let data = await res.json()

    if (!res.ok) {
      alert(data.error)
      setLoading(false)
      return
    }

    localStorage.setItem("doctor_id", data.doctor_id)
    window.location.href = "/doctor";
  }

  return (
    <div className="min-h-screen flex justify-center items-center bg-white p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <CardTitle className="text-center text-red-600">Doctor Login</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <Input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
          <Input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
        </CardContent>

        <CardFooter>
          <Button className="w-full bg-red-600 hover:bg-red-700"
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
