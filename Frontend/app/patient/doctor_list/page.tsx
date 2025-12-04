"use client"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"

interface Doctor {
  id: number
  email: string
}

export default function DoctorListPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [selectedDoctor, setSelectedDoctor] = useState<number | null>(null)

  useEffect(() => {
    async function fetchDoctors() {
    // const storedOtp = window.localStorage.getItem("otp");

      let res = await fetch("http://localhost:5000/api/v1/patient/list")
      let data = await res.json()
      setDoctors(data.doctors)
    }
    fetchDoctors()
  }, [])

const handleSelect = async () => {
  if (!selectedDoctor) return

  try {
    const res = await fetch("http://localhost:5000/api/v1/patient/list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doctor_id: selectedDoctor }),
    })

    if (!res.ok) {
      const err = await res.json()
      alert("Failed to save doctor: " + (err.message || "Unknown error"))
      return
    }

    // Save locally for patient flow
    localStorage.setItem("selectedDoctorId", selectedDoctor.toString())

    // Redirect to OTP page
    window.location.href = "/patient"
  } catch (error) {
    console.error(error)
    alert("Error connecting to server")
  }
}

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <h1 className="text-2xl font-bold text-red-700 mb-6">Select Your Doctor</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-xl">
        {doctors.map((doc) => (
          <Card
            key={doc.id}
            className={`cursor-pointer border-2 p-4 ${selectedDoctor === doc.id ? "border-red-600" : "border-gray-200"}`}
            onClick={() => setSelectedDoctor(doc.id)}
          >
            <CardHeader>
              <CardTitle>{doc.email}</CardTitle>
            </CardHeader>
            <CardContent>Select this doctor</CardContent>
            <CardFooter>
              <Button variant={selectedDoctor === doc.id ? "default" : "outline"} className="w-full">
                {selectedDoctor === doc.id ? "Selected" : "Select"}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      <Button
        className="mt-6 bg-red-600 hover:bg-red-700 w-full max-w-xs"
        onClick={handleSelect}
        disabled={!selectedDoctor}
      >
        Continue
      </Button>
    </div>
  )
}
