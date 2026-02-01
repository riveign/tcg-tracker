import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export const Complete = () => {
  return (
    <div className="container mx-auto p-4 space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-text-primary font-display">
          Complete Collection
        </h1>
        <p className="text-text-secondary mt-1">
          Aggregated view of all your cards
        </p>
      </div>

      {/* Stats overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Cards</CardDescription>
            <CardTitle className="text-4xl text-accent-cyan">0</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Unique Cards</CardDescription>
            <CardTitle className="text-4xl text-accent-lavender">0</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Collections</CardDescription>
            <CardTitle className="text-4xl text-success">0</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filtering tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="set">By Set</TabsTrigger>
          <TabsTrigger value="color">By Color</TabsTrigger>
          <TabsTrigger value="type">By Type</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-text-secondary">
                No cards in your collection yet
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="set" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-text-secondary">
                No sets to display
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="color" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-text-secondary">
                No color distribution data
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="type" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-text-secondary">
                No card types to display
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
